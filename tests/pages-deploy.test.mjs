import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = 'a'.repeat(40);
const pagesEnv = { GITHUB_SHA: sha, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', SITE_TARGET: 'pages',
  SITE_ORIGIN: 'https://validation-only.pages.dev', CLOUDFLARE_PAGES_PROJECT: 'validation-only' };
const credentialEnv = { ...pagesEnv, CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_PAGES_API_TOKEN: 'pages-test-secret',
  ORCAROUTER_API_KEY: 'ai-test-secret', GITHUB_TOKEN: 'github-test-secret', CLOUDFLARE_API_TOKEN: 'worker-test-secret' };
async function load() {
  assert.ok(existsSync(path.join(root, 'scripts/deploy-site.mjs')), 'Pages deployment implementation is missing');
  return { ...await import('../scripts/pages-config.mjs'), ...await import('../scripts/static-output.mjs'), ...await import('../scripts/deploy-site.mjs') };
}
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'pages-deploy-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const put = (file, content) => { const dest = path.join(directory, file); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, content); };
  put('wrangler.pages.jsonc', JSON.stringify({ pages_build_output_dir: './dist', compatibility_date: '2026-09-28' }));
  put('node_modules/wrangler/package.json', '{"version":"4.133.0"}');
  const locations = [];
  for (const [file, route] of [['index.html', ''], ['about.html', 'about'], ['privacy.html', 'privacy'], ['404.html', null]]) {
    const url = route === null ? null : `${pagesEnv.SITE_ORIGIN}/${route}`;
    if (url) locations.push(url);
    put(`dist/${file}`, `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src 'none'">${url ? `<link rel="canonical" href="${url}">` : ''}</head><body>test</body></html>`);
  }
  put('dist/sitemap.xml', `<urlset>${locations.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
  put('dist/chat-docs.json', '[{"url":"/about"}]');
  put('dist/robots.txt', `Sitemap: ${pagesEnv.SITE_ORIGIN}/sitemap.xml\n`);
  return { root: directory, output: path.join(directory, 'dist'), put };
}
const project = () => ({ name: 'validation-only', subdomain: 'validation-only.pages.dev', production_branch: 'main', source: null,
  deployment_configs: { production: {}, preview: {} } });
const projectResponse = () => Response.json({ success: true, result: project() });

test('deployment defaults preserve GitHub and the existing AI without registering variables', async () => {
  const { selectDeployment } = await load();
  for (const settings of [{}, { SITE_TARGET: '', SITE_ORIGIN: 'https://validation-only.pages.dev', ADS_MODE: 'verify' }]) {
    const record = selectDeployment({ GITHUB_SHA: sha, ...settings });
    assert.equal(record.siteEnv.SITE_TARGET, 'github');
    assert.equal(record.siteEnv.SITE_BASE, '/work-history/');
    assert.equal(record.siteEnv.ADS_MODE, 'off');
    assert.equal(record.siteEnv.VITE_CHAT_API_URL, 'https://work-history-chat.kim-h-g199510.workers.dev');
    assert.equal(record.projectName, '');
  }
});

test('Pages selection validates the chosen project and requires manual confirmation', async () => {
  const { selectDeployment, validSha } = await load();
  const record = selectDeployment(pagesEnv);
  assert.equal(record.siteEnv.SITE_BASE, '/');
  assert.equal(record.siteEnv.SITE_ORIGIN, pagesEnv.SITE_ORIGIN);
  const manual = { ...pagesEnv, SITE_TARGET: '', GITHUB_EVENT_NAME: 'workflow_dispatch', DEPLOY_TARGET: 'pages' };
  assert.throws(() => selectDeployment(manual), /Confirm/);
  assert.equal(selectDeployment({ ...manual, PAGES_DEPLOY_CONFIRMED: 'true' }).siteEnv.SITE_TARGET, 'pages');
  for (const name of ['', '-name', 'name-', '../other', 'name\n', 'a'.repeat(59)]) assert.throws(() => selectDeployment({ ...pagesEnv, CLOUDFLARE_PAGES_PROJECT: name }));
  for (const value of ['', '0'.repeat(40), sha + '\n']) assert.equal(validSha(value), false);
  assert.throws(() => selectDeployment({ ...pagesEnv, SITE_TARGET: 'oops' }));
  assert.throws(() => selectDeployment({ ...pagesEnv, SITE_ORIGIN: undefined }));
  assert.throws(() => selectDeployment({ ...pagesEnv, ADS_MODE: 'enabled' }));
});

test('build metadata rejects stale SHAs, injected variables and mismatched settings', async () => {
  const { selectDeployment, validateDeployment } = await load();
  const record = selectDeployment(credentialEnv);
  assert.deepEqual(validateDeployment(record, sha), record);
  assert.doesNotMatch(JSON.stringify(record), /test-secret/);
  for (const mutate of [r => { r.sha = 'c'.repeat(40); }, r => { r.extra = 'injected'; }, r => { r.siteEnv.NODE_OPTIONS = 'injected'; },
    r => { r.siteEnv.SITE_BASE = '/wrong/'; }, r => { r.siteEnv.SITE_ORIGIN += '/'; }, r => { r.siteEnv = null; }]) {
    const bad = structuredClone(record); mutate(bad);
    assert.throws(() => validateDeployment(bad, sha));
  }
});

test('plain static output passes and executable entries or secrets are rejected', async t => {
  const { assertStaticOutput } = await load();
  const f = fixture(t);
  await assertStaticOutput(f.output, { root: f.root });
  for (const name of ['functions/index.js', '_worker.js', '_worker.js/index.js', '_routes.json', 'assets/.env.local', 'assets/wrangler.json', '.git/config']) {
    f.put(`dist/${name}`, 'test');
    await assert.rejects(assertStaticOutput(f.output, { root: f.root }), /Forbidden/);
    rmSync(path.join(f.output, name.split('/')[0]), { recursive: true, force: true });
  }
  for (const name of ['functions', '_worker.js']) {
    f.put(name, 'test');
    await assert.rejects(assertStaticOutput(f.output, { root: f.root }), /Forbidden/);
    rmSync(path.join(f.root, name));
  }
});

test('static scan rejects symlinks including a symlinked output root and oversized files', async t => {
  const { assertStaticOutput } = await load();
  const f = fixture(t);
  symlinkSync(f.output, path.join(f.root, 'linked'));
  await assert.rejects(assertStaticOutput(path.join(f.root, 'linked'), { root: f.root }), /symlink/i);
  symlinkSync(path.join(f.output, 'index.html'), path.join(f.output, 'link.html'));
  await assert.rejects(assertStaticOutput(f.output, { root: f.root }), /symlink/i);
  rmSync(path.join(f.output, 'link.html'));
  f.put('dist/large.bin', ''); truncateSync(path.join(f.output, 'large.bin'), 25 * 1024 * 1024 + 1);
  await assert.rejects(assertStaticOutput(f.output, { root: f.root }), /limits/);
});

test('static config refuses all runtime options, unknown fields and invalid dates', async t => {
  const { readStaticConfig } = await load();
  const f = fixture(t);
  for (const extra of [{ main: 'worker.js' }, { env: {} }, { bindings: [] }, { migrations: [] }, { kv_namespaces: [] },
    { pages_build_output_dir: '../dist' }, { compatibility_date: '2026-02-30' }, { compatibility_date: 'not-date' }]) {
    f.put('wrangler.pages.jsonc', JSON.stringify({ pages_build_output_dir: './dist', compatibility_date: '2026-09-28', ...extra }));
    await assert.rejects(readStaticConfig(path.join(f.root, 'wrangler.pages.jsonc')));
  }
});

test('PR events, unconfirmed dispatch, wrong branch and wrong metadata never call Cloudflare', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let calls = 0;
  const options = { ...f, record: selectDeployment(pagesEnv), fetchImpl: async () => { calls++; return projectResponse(); }, run: () => { calls++; return { status: 0 }; }, current: () => true };
  for (const env of [{ ...credentialEnv, GITHUB_EVENT_NAME: 'pull_request' }, { ...credentialEnv, GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { ...credentialEnv, GITHUB_REF: 'refs/heads/topic' }, { ...credentialEnv, GITHUB_SHA: 'c'.repeat(40) }]) {
    await assert.rejects(deploySite({ ...options, env }));
  }
  assert.equal(calls, 0);
});

test('invalid output and missing dedicated credentials fail before network or upload', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let calls = 0;
  const options = { ...f, record: selectDeployment(pagesEnv), current: () => true,
    fetchImpl: async () => { calls++; return projectResponse(); }, run: () => { calls++; return { status: 0 }; } };
  await assert.rejects(deploySite({ ...options, env: { ...credentialEnv, CLOUDFLARE_PAGES_API_TOKEN: '' } }), /credentials/);
  f.put('dist/_worker.js', 'test');
  await assert.rejects(deploySite({ ...options, env: credentialEnv }), /Forbidden/);
  assert.equal(calls, 0);
});

test('outdated builds are skipped before network and rechecked immediately before upload', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let gets = 0; let uploads = 0;
  const options = { ...f, record: selectDeployment(pagesEnv), env: credentialEnv,
    fetchImpl: async () => { gets++; return projectResponse(); }, run: () => { uploads++; return { status: 0 }; } };
  assert.equal((await deploySite({ ...options, current: () => false })).deployed, false);
  assert.equal(gets, 0);
  let count = 0;
  assert.equal((await deploySite({ ...options, current: () => ++count === 1 })).deployed, false);
  assert.equal(gets, 1); assert.equal(uploads, 0); assert.equal(count, 2);
});

test('one Pages upload uses isolated config and only the dedicated token; staging is removed', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let gets = 0; let uploads = 0; let staged;
  const result = await deploySite({ ...f, record: selectDeployment(pagesEnv), env: credentialEnv, current: () => true,
    fetchImpl: async (url, options) => { gets++; assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
      assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${credentialEnv.CLOUDFLARE_ACCOUNT_ID}/pages/projects/validation-only`);
      assert.equal(options.headers.Authorization, 'Bearer pages-test-secret'); return projectResponse(); },
    run: (command, args, options) => {
      uploads++; staged = options.cwd;
      assert.equal(command, process.execPath);
      assert.deepEqual(args, [path.join(f.root, 'node_modules/wrangler/bin/wrangler.js'), 'pages', 'deploy', './dist', '--project-name', 'validation-only', '--branch', 'main', '--commit-hash', sha, '--commit-dirty=true', '--force']);
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, 'pages-test-secret');
      for (const name of ['ORCAROUTER_API_KEY', 'GITHUB_TOKEN', 'NODE_OPTIONS']) assert.equal(options.env[name], undefined);
      assert.notEqual(staged, f.root);
      assert.deepEqual(JSON.parse(readFileSync(path.join(staged, 'wrangler.json'), 'utf8')), { pages_build_output_dir: './dist', compatibility_date: '2026-09-28' });
      assert.equal(existsSync(path.join(staged, 'functions')), false);
      assert.equal(existsSync(path.join(staged, 'wrangler.pages.jsonc')), false);
      assert.equal(existsSync(path.join(staged, 'dist/index.html')), true);
      return { status: 0 };
    } });
  assert.equal(result.deployed, true); assert.equal(result.origin, pagesEnv.SITE_ORIGIN);
  assert.equal(gets, 1); assert.equal(uploads, 1); assert.equal(existsSync(staged), false);
});

test('unknown projects, Git integration, domain mismatch and runtime bindings stop upload', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let uploads = 0;
  const options = { ...f, record: selectDeployment(pagesEnv), env: credentialEnv, current: () => true, run: () => { uploads++; return { status: 0 }; } };
  for (const change of [p => { p.subdomain = 'wrong.pages.dev'; }, p => { p.production_branch = 'develop'; }, p => { p.source = { type: 'github' }; },
    p => { p.deployment_configs.production.kv_namespaces = { TEST: 'id' }; }, p => { p.deployment_configs.preview.ai_bindings = { AI: {} }; },
    p => { delete p.deployment_configs.preview; }]) {
    const value = project(); change(value);
    await assert.rejects(deploySite({ ...options, fetchImpl: async () => Response.json({ success: true, result: value }) }));
  }
  for (const fetchImpl of [async () => new Response('private error', { status: 404 }), async () => Response.json({ success: false }),
    async () => new Response('bad JSON'), async () => { throw Error('private-token'); }]) {
    await assert.rejects(deploySite({ ...options, fetchImpl }), error => !error.message.includes('private-token'));
  }
  assert.equal(uploads, 0);
});

test('CLI failures never expose raw secrets and always clean temporary files', async t => {
  const { deploySite, selectDeployment } = await load();
  const f = fixture(t); let staged;
  await assert.rejects(deploySite({ ...f, record: selectDeployment(pagesEnv), env: credentialEnv, current: () => true, fetchImpl: projectResponse,
    run: (command, args, options) => { staged = options.cwd; return { status: 1, stderr: 'pages-test-secret' }; } }),
    error => /upload failed/i.test(error.message) && !error.message.includes('pages-test-secret'));
  assert.equal(existsSync(staged), false);
});
