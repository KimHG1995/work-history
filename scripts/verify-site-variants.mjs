import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectDeployment } from './pages-config.mjs';
import { checkPagesArtifact } from './deploy-site.mjs';

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
    await checkPagesArtifact({ root, output: path.join(root, 'site/.vitepress/dist'), record, sha: record.sha });
    // Help validates the pinned CLI syntax without a deployment or account request.
    execFileSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
      'pages', 'deploy', './dist', '--force', '--help'], { stdio: 'pipe', timeout: 30000,
      env: { PATH: process.env.PATH, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
    console.log('Pages static-only upload gate and CLI syntax verified offline.');
  } else {
    console.log('Alternate target build skipped: no relevant configuration changes.');
  }
}
