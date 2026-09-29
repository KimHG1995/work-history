import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapPages } from '../scripts/bootstrap-pages.mjs';
import { deploySite } from '../scripts/deploy-site.mjs';
import { selectDeployment } from '../scripts/pages-config.mjs';
const sha = 'a'.repeat(40);
const origin = 'https://validation-only.pages.dev';
const env = { GITHUB_SHA: sha, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  PAGES_BOOTSTRAP_CONFIRMED: 'true', PAGES_BOOTSTRAP_PROJECT: 'validation-only',
  CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_PAGES_API_TOKEN: 'test-only-token' };
const project = { name: 'validation-only', subdomain: 'validation-only.pages.dev', production_branch: 'main',
  source: null, deployment_configs: { production: {}, preview: {} } };
const ok = () => Response.json({ success: true, result: project });
const missing = () => Response.json({ success: false, errors: [{ code: 8000007 }] }, { status: 404 });

test('post-create transient 404 is read again without creating a second project', async () => {
  const calls = [], waits = [];
  const result = await bootstrapPages({ env, current: () => true, pause: async ms => waits.push(ms),
    fetchImpl: async (_, init) => {
      calls.push(init.method);
      return calls.length === 1 || calls.length === 3 ? missing() : ok();
    } });
  assert.deepEqual(calls, ['GET', 'POST', 'GET', 'GET']);
  assert.deepEqual(waits, [1000]);
  assert.equal(result.created, true);
  assert.equal(result.project.origin, origin);
});

test('post-create lookup retries are bounded and identify the failing phase', async () => {
  const calls = [], waits = [];
  await assert.rejects(bootstrapPages({ env, current: () => true, pause: async ms => waits.push(ms),
    fetchImpl: async (_, init) => { calls.push(init.method); return init.method === 'POST' ? ok() : missing(); } }),
    /project-readback.*not yet readable/i);
  assert.deepEqual(calls, ['GET', 'POST', 'GET', 'GET', 'GET']);
  assert.deepEqual(waits, [1000, 2000]);
});

test('post-create authorization errors are not retried or mistaken for propagation', async () => {
  const calls = [], waits = [];
  await assert.rejects(bootstrapPages({ env, current: () => true, pause: async ms => waits.push(ms),
    fetchImpl: async (_, init) => {
      calls.push(init.method);
      return calls.length === 1 ? missing() : calls.length === 2 ? ok()
        : Response.json({ success: false, errors: [{ code: 10000 }] }, { status: 403 });
    } }), /project-readback.*HTTP 403/);
  assert.deepEqual(calls, ['GET', 'POST', 'GET']);
  assert.deepEqual(waits, []);
});

test('the actual staged Wrangler config reaches the credential gate without network or real credentials', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'pages-cli-regression-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const put = (file, value) => { const dest = path.join(directory, file); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, value); };
  const template = { pages_build_output_dir: './dist', compatibility_date: '2026-09-28' };
  put('wrangler.pages.jsonc', JSON.stringify(template));
  put('node_modules/wrangler/package.json', '{"version":"4.133.0"}');
  const urls = [];
  for (const [file, route] of [['index.html', ''], ['about.html', 'about'], ['privacy.html', 'privacy'], ['404.html', null]]) {
    const url = route === null ? null : `${origin}/${route}`;
    if (url) urls.push(url);
    put(`dist/${file}`, `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src 'none'">${url ? `<link rel="canonical" href="${url}">` : ''}</head><body>test</body></html>`);
  }
  put('dist/sitemap.xml', `<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
  put('dist/chat-docs.json', '[{"url":"/about"}]');
  put('dist/robots.txt', `Sitemap: ${origin}/sitemap.xml\n`);
  // The probe intentionally has no token and forbids network in all child processes.
  put('deny-network.cjs', `const net = require('node:net');
net.Socket.prototype.connect = function () { process.stderr.write('TEST_NETWORK_ATTEMPT\\n'); throw new Error('Network forbidden in CLI configuration probe'); };
`);
  const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
  const record = selectDeployment({ GITHUB_SHA: sha, SITE_TARGET: 'pages', SITE_ORIGIN: origin, CLOUDFLARE_PAGES_PROJECT: 'validation-only' });
  let checked = false;
  await deploySite({ root: directory, output: path.join(directory, 'dist'), record,
    env: { ...env, PAGES_DEPLOY_CONFIRMED: 'true' }, current: () => true, fetchImpl: async () => ok(),
    run: (_command, args, options) => {
      const staged = JSON.parse(readFileSync(path.join(options.cwd, 'wrangler.json'), 'utf8'));
      const probe = spawnSync(process.execPath, [cli, ...args.slice(1)], {
        cwd: options.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000,
        env: { PATH: process.env.PATH, HOME: options.env.HOME, CI: 'true', WRANGLER_SEND_METRICS: 'false',
          CLOUDFLARE_AUTH_USE_KEYRING: 'false', NODE_OPTIONS: `--require=${path.join(directory, 'deny-network.cjs')}` }
      });
      const text = `${probe.stdout || ''}\n${probe.stderr || ''}`;
      assert.doesNotMatch(text, /Missing top-level field "name"/, text);
      assert.doesNotMatch(text, /TEST_NETWORK_ATTEMPT/, text);
      assert.equal(probe.status, 1, text);
      assert.match(text, /CLOUDFLARE_API_TOKEN/, text);
      assert.deepEqual(staged, { ...template, name: 'validation-only' });
      checked = true;
      // The real CLI stopped at missing authentication. Only this mock upload succeeds.
      return { status: 0 };
    } });
  assert.equal(checked, true);
});
