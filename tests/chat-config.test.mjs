import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// From the successful deployment log of run 35672720750, not an example URL.
const existingApi = 'https://work-history-chat.kim-h-g199510.workers.dev';
const alternateApi = 'https://work-history-chat.test-account.workers.dev';

function fixture(value) {
  const directory = mkdtempSync(path.join(tmpdir(), 'chat-config-'));
  for (const folder of ['scripts', 'site/.vitepress/dist', 'projects', 'node_modules/vitepress']) {
    mkdirSync(path.join(directory, folder), { recursive: true });
  }
  for (const file of ['scripts/secure-site.mjs', 'site/.vitepress/config.mjs', 'site/chat.config.mjs']) {
    if (existsSync(path.join(root, file))) copyFileSync(path.join(root, file), path.join(directory, file));
  }
  // Only the config identity helper is replaced. Production config and CSP code run unchanged.
  // Tests remain runnable without npm ci for test-only commits.
  writeFileSync(path.join(directory, 'node_modules/vitepress/package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
  writeFileSync(path.join(directory, 'node_modules/vitepress/index.js'), 'export const defineConfig = config => config;\n');
  writeFileSync(path.join(directory, 'site/.vitepress/dist/chat-docs.json'), '[]');
  writeFileSync(path.join(directory, 'site/.vitepress/dist/index.html'), '<!doctype html><html><head><script>window.ready=true;</script></head><body>docs</body></html>');
  const env = { ...process.env, CLOUDFLARE_API_TOKEN: 'test-only-cloud-secret', ORCAROUTER_API_KEY: 'test-only-ai-secret' };
  delete env.VITE_CHAT_API_URL;
  if (value !== undefined) env.VITE_CHAT_API_URL = value;
  const node = args => spawnSync(process.execPath, args, { cwd: directory, env, encoding: 'utf8', timeout: 10000 });
  return {
    directory,
    config: () => node(['--input-type=module', '-e', `globalThis.fetch=()=>{throw Error('No network during configuration')}; const config=(await import(${JSON.stringify(pathToFileURL(path.join(directory, 'site/.vitepress/config.mjs')).href)})).default; console.log(JSON.stringify(config.vite?.define ?? {}));`]),
    secure: () => node(['scripts/secure-site.mjs']),
    html: () => readFileSync(path.join(directory, 'site/.vitepress/dist/index.html'), 'utf8'),
    dispose: () => rmSync(directory, { recursive: true, force: true })
  };
}

for (const [name, value, expected] of [
  ['unset variable', undefined, existingApi],
  ['empty Actions variable', '', existingApi],
  ['whitespace variable', ' \t ', existingApi],
  ['explicit override', alternateApi, alternateApi],
  ['explicit off', 'off', '']
]) {
  test(`${name}: client definition and CSP use the same resolved origin`, () => {
    const instance = fixture(value);
    try {
      const config = instance.config();
      assert.equal(config.status, 0, config.stderr);
      const definitions = JSON.parse(config.stdout);
      assert.equal(definitions['import.meta.env.VITE_CHAT_API_URL'], JSON.stringify(expected));
      assert.deepEqual(Object.keys(definitions), ['import.meta.env.VITE_CHAT_API_URL']);
      const secured = instance.secure();
      assert.equal(secured.status, 0, secured.stderr);
      const html = instance.html();
      const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
      assert.ok(policy);
      const connection = policy.split('; ').find(rule => rule.startsWith('connect-src '));
      assert.deepEqual(connection.trim().split(/\s+/), ['connect-src', "'self'", 'https://*.clarity.ms', 'https://c.bing.com', ...(expected ? [expected] : [])]);
      assert.match(policy, /script-src 'self' https:\/\/\*\.clarity\.ms 'sha256-/);
      assert.match(policy, /frame-src 'none'/);
      assert.doesNotMatch(config.stdout + html, /test-only-cloud-secret|test-only-ai-secret/);
    } finally { instance.dispose(); }
  });
}

test('CSP preserves the existing Worker origin without any environment variable', () => {
  const instance = fixture(undefined);
  try {
    const result = instance.secure();
    assert.equal(result.status, 0, result.stderr);
    assert.ok(instance.html().includes(existingApi), 'Default Worker is missing from connect-src');
  } finally { instance.dispose(); }
});

test('malformed overrides fail both configuration and CSP generation rather than silently disabling AI', () => {
  for (const value of [
    'http://work-history-chat.test.workers.dev',
    `${existingApi}/chat`, `${existingApi}/`, `${existingApi}?key=x`, `${existingApi}#fragment`,
    `${existingApi}.attacker.test`, 'https://user:password@work-history-chat.test.workers.dev',
    'https://work-history-chat.-invalid.workers.dev', 'https://work-history-chat.invalid-.workers.dev',
    'https://work-history-chat.test.workers.dev:443', 'not-a-url', 'OFF'
  ]) {
    const instance = fixture(value);
    try {
      assert.notEqual(instance.config().status, 0, `Config accepted ${value}`);
      assert.notEqual(instance.secure().status, 0, `CSP accepted ${value}`);
      assert.doesNotMatch(instance.html(), /Content-Security-Policy/);
    } finally { instance.dispose(); }
  }
});
