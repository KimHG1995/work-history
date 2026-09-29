import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectDeployment } from './pages-config.mjs';
import { checkPagesArtifact, deploySite } from './deploy-site.mjs';

const inputs = new Set([
  'scripts/site-config.mjs', 'scripts/prepare-public.mjs', 'scripts/prepare-site.mjs',
  'scripts/prepare-chat.mjs', 'scripts/secure-site.mjs', 'scripts/verify-site-output.mjs',
  'scripts/verify-site-variants.mjs', 'site/.vitepress/config.mjs', 'site/chat.config.mjs',
  'package.json', 'package-lock.json', 'security/domain-root/robots.txt', '.github/workflows/docs-check.yml',
  'scripts/deploy-site.mjs', 'scripts/pages-config.mjs', 'scripts/static-output.mjs', 'scripts/run-ci.mjs',
  'wrangler.pages.jsonc', '.github/workflows/pages.yml'
]);
export function needsSiteVariant(impact, eventName) {
  return ['pull_request', 'merge_group'].includes(eventName) && impact.build === true &&
    (impact.fallback === true || impact.paths.some(file => inputs.has(file) || file.startsWith('site/pages/')));
}

/** Exercise the exact staged config, not --help. All account access is mocked.
 * Real CLI children receive no credentials and cannot open a network socket. */
async function verifyStagedCli(root, output, record) {
  const probes = [];
  let staged;
  await deploySite({ root, output, record,
    env: { GITHUB_SHA: record.sha, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push',
      CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_PAGES_API_TOKEN: 'offline-probe-only' },
    current: () => true,
    fetchImpl: async () => Response.json({ success: true, result: {
      name: record.projectName, subdomain: new URL(record.siteEnv.SITE_ORIGIN).hostname, production_branch: 'main',
      source: null, deployment_configs: { production: {}, preview: {} }
    } }),
    run: (command, args, options) => {
      const file = path.join(options.cwd, 'wrangler.json');
      staged = JSON.parse(readFileSync(file, 'utf8'));
      const legacy = { ...staged }; delete legacy.name;
      const guard = path.join(options.cwd, 'deny-network.cjs');
      writeFileSync(guard, `require('node:net').Socket.prototype.connect = function () {
        process.stderr.write('TEST_NETWORK_ATTEMPT\\n'); throw Error('Network forbidden in CLI configuration probe');
      };`);
      for (const config of [legacy, staged]) {
        writeFileSync(file, JSON.stringify(config));
        const probe = spawnSync(command, args, { cwd: options.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000,
          env: { PATH: process.env.PATH, HOME: options.env.HOME, CI: 'true', WRANGLER_SEND_METRICS: 'false',
            CLOUDFLARE_AUTH_USE_KEYRING: 'false', NODE_OPTIONS: `--require=${guard}` }
        });
        probes.push({ status: probe.status, text: `${probe.stdout || ''}\n${probe.stderr || ''}` });
      }
      return { status: 0 }; // Mock upload only; both real CLI processes must stop before authentication.
    }
  });
  assert.equal(probes.length, 2);
  assert.equal(staged.name, record.projectName);
  for (const probe of probes) {
    assert.equal(probe.status, 1, probe.text);
    assert.doesNotMatch(probe.text, /TEST_NETWORK_ATTEMPT/, probe.text);
  }
  assert.match(probes[0].text, /Missing top-level field "name"/, probes[0].text);
  assert.doesNotMatch(probes[1].text, /Missing top-level field "name"/, probes[1].text);
  assert.match(probes[1].text, /CLOUDFLARE_API_TOKEN/, probes[1].text);
  console.log('Real Pages CLI: missing-name baseline reproduced; current staged config reaches the authentication gate without network.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const impact = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (needsSiteVariant(impact, process.env.GITHUB_EVENT_NAME)) {
    // Synthetic verification build only. PR has no upload step and no cloud credentials.
    const env = {
      ...process.env, SITE_TARGET: 'pages', SITE_ORIGIN: 'https://validation-only.pages.dev',
      SITE_BASE: '/', ADS_MODE: 'verify', ADS_CSP_MODE: 'strict',
      ADS_PUBLISHER_ID: 'ca-pub-1234567890123456', ADS_SLOT_ID: ''
    };
    execFileSync('npm', ['run', 'docs:build'], { stdio: 'inherit', env });
    const root = path.resolve(import.meta.dirname, '..');
    const record = selectDeployment({ ...env, GITHUB_EVENT_NAME: 'push', CLOUDFLARE_PAGES_PROJECT: 'validation-only' });
    const output = path.join(root, 'site/.vitepress/dist');
    await checkPagesArtifact({ root, output, record, sha: record.sha });
    await verifyStagedCli(root, output, record);
    console.log('Pages static-only upload gate and actual CLI configuration verified offline.');
  } else {
    console.log('Alternate target build skipped: no relevant configuration changes.');
  }
}
