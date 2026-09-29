import { spawnSync } from 'node:child_process';
import { appendFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateDeployment } from './pages-config.mjs';
import { readSiteConfig } from './site-config.mjs';
import { assertStaticOutput } from './static-output.mjs';
import { verifySiteOutput } from './verify-site-output.mjs';
import { productionInputsCurrent } from './check-deploy.mjs';

const nonempty = value => value != null && (typeof value !== 'object' ? value !== '' : Object.keys(value).length > 0);
function checkProject(project, record) {
  if (!project || project.name !== record.projectName || `https://${project.subdomain}` !== record.siteEnv.SITE_ORIGIN || project.production_branch !== 'main') {
    throw new Error('Pages project, production branch or public origin does not match the build.');
  }
  if (project.source) throw new Error('Use an existing Direct Upload project without Git integration.');
  for (const kind of ['production', 'preview']) {
    const config = project.deployment_configs?.[kind];
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Pages runtime configuration could not be verified.');
    if (Object.entries(config).some(([key, value]) => /bindings|namespaces|databases|buckets|services|browsers|queue|env_vars|send_email/.test(key) && nonempty(value))) {
      throw new Error('Pages project contains runtime bindings or environment variables; review before deploying.');
    }
  }
}

/** Validation is shared by artifact creation, offline CI, and the final upload gate. */
export async function checkPagesArtifact({ root, output, record, sha }) {
  const safe = validateDeployment(record, sha);
  if (safe.siteEnv.SITE_TARGET !== 'pages') throw new Error('A Pages artifact is required');
  const config = await assertStaticOutput(output, { root });
  await verifySiteOutput(output, readSiteConfig(safe.siteEnv));
  return { record: safe, config };
}

/** No new project creation, Worker deploy, model request, subscription or DNS mutation. */
export async function deploySite({ root = process.cwd(), output, record, env = process.env, fetchImpl = fetch, run = spawnSync, current = productionInputsCurrent }) {
  if (env.GITHUB_REF !== 'refs/heads/main' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) throw new Error('Pages upload is allowed only for main push or explicit manual deployment.');
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.PAGES_DEPLOY_CONFIRMED !== 'true') throw new Error('Confirm the manual Pages deployment first.');
  const checked = await checkPagesArtifact({ root, output, record, sha: env.GITHUB_SHA });
  const freshness = () => current({ cwd: root, sha: checked.record.sha, ref: env.GITHUB_REF });
  if (!await freshness()) return { deployed: false, reason: 'newer-site-inputs' };
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_PAGES_API_TOKEN;
  if (typeof account !== 'string' || account.length !== 32 || !/^[a-f0-9]{32}$/i.test(account) || typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) throw new Error('Missing or invalid Pages-specific deployment credentials.');
  const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
  const installed = JSON.parse(await readFile(path.join(root, 'node_modules/wrangler/package.json'), 'utf8'));
  if (installed.version !== '4.133.0') throw new Error('Review the Pages invocation before changing the pinned Wrangler version.');
  let response;
  try {
    response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${checked.record.projectName}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000)
    });
  } catch { throw new Error('Pages project preflight failed; no upload was attempted.'); }
  if (!response.ok) throw new Error(`Pages project preflight HTTP ${response.status}; no upload was attempted.`);
  let body;
  try { body = await response.json(); } catch { throw new Error('Invalid Pages project preflight response'); }
  if (body?.success !== true) throw new Error('Pages project preflight was not successful');
  checkProject(body.result, checked.record);

  // --config is unsupported by this pinned Pages CLI. Its normal discovery must
  // see only our static config, never the repository's AI Worker configuration.
  const stage = await mkdtemp(path.join(tmpdir(), 'work-history-pages-'));
  try {
    await cp(output, path.join(stage, 'dist'), { recursive: true, dereference: false });
    await writeFile(path.join(stage, 'wrangler.pages.jsonc'), JSON.stringify(checked.config));
    await assertStaticOutput(path.join(stage, 'dist'), { root: stage });
    await verifySiteOutput(path.join(stage, 'dist'), readSiteConfig(checked.record.siteEnv));
    await rm(path.join(stage, 'wrangler.pages.jsonc'));
    // Pages validates the raw top-level name before resolving --project-name.
    await writeFile(path.join(stage, 'wrangler.json'), JSON.stringify({ ...checked.config, name: checked.record.projectName }));
    await mkdir(path.join(stage, '.home'));
    if (!await freshness()) return { deployed: false, reason: 'newer-site-inputs' };
    let result;
    try {
      result = await run(process.execPath, [cli, 'pages', 'deploy', './dist', '--project-name', checked.record.projectName,
        '--branch', 'main', '--commit-hash', checked.record.sha, '--commit-dirty=true', '--force'], {
        cwd: stage, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000, maxBuffer: 4 * 1024 * 1024,
        env: { PATH: process.env.PATH, HOME: path.join(stage, '.home'), CI: 'true', WRANGLER_SEND_METRICS: 'false',
          CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token }
      });
    } catch { throw new Error('Pages upload failed. Raw CLI output is withheld to protect credentials.'); }
    if (result?.status !== 0) throw new Error('Pages upload failed. Check project access and the Pages dashboard. Raw CLI output is withheld.');
    return { deployed: true, origin: checked.record.siteEnv.SITE_ORIGIN };
  } finally { await rm(stage, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [mode, metadata, directory] = process.argv.slice(2);
    if (!['--check', '--upload'].includes(mode) || !metadata || !directory) throw new Error('Usage: deploy-site.mjs --check|--upload <metadata.json> <static-directory>');
    const root = path.resolve(import.meta.dirname, '..');
    const record = JSON.parse(await readFile(metadata, 'utf8'));
    const options = { root, output: path.resolve(directory), record, sha: process.env.GITHUB_SHA };
    if (mode === '--check') {
      await checkPagesArtifact(options);
      console.log('Pages artifact verified offline; no Cloudflare request was made.');
    } else {
      const result = await deploySite(options);
      if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `deployed=${result.deployed}\n`);
      const message = result.deployed ? `Pages upload completed: ${result.origin}` : 'Pages upload skipped: newer site inputs exist.';
      console.log(message);
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## 정적 Pages 배포\n\n${message}\n`);
    }
  } catch (error) {
    const tokens = [process.env.CLOUDFLARE_PAGES_API_TOKEN, process.env.CLOUDFLARE_API_TOKEN, process.env.ORCAROUTER_API_KEY].filter(Boolean);
    let message = String(error?.message || 'Pages deployment failed');
    for (const token of tokens) message = message.split(token).join('[redacted]');
    console.error(message.slice(0, 1000));
    process.exitCode = 1;
  }
}
