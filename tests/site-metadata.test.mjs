import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

for (const target of ['github', 'pages']) {
  test(`${target}: VitePress metadata, sitemap, navigation and Clarity share the target`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'site-metadata-'));
    try {
      for (const folder of ['site/.vitepress', 'scripts', 'projects', 'node_modules/vitepress']) mkdirSync(path.join(dir, folder), { recursive: true });
      for (const file of ['site/.vitepress/config.mjs', 'site/chat.config.mjs', 'scripts/site-config.mjs']) cpSync(path.join(root, file), path.join(dir, file));
      writeFileSync(path.join(dir, 'node_modules/vitepress/package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
      writeFileSync(path.join(dir, 'node_modules/vitepress/index.js'), 'export const defineConfig = value => value;');
      const env = { ...process.env, SITE_TARGET: target, SITE_BASE: '', ADS_MODE: target === 'pages' ? 'verify' : 'off', ADS_PUBLISHER_ID: 'ca-pub-1234567890123456', ADS_CSP_MODE: 'strict', SITE_ORIGIN: target === 'pages' ? 'https://validation-only.pages.dev' : '', VITE_CHAT_API_URL: '' };
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        globalThis.fetch = () => { throw Error('Network access during static configuration'); };
        const config = (await import('./site/.vitepress/config.mjs')).default;
        const page = {relativePath:'projects/demo/index.md',frontmatter:{}};
        config.transformPageData(page);
        console.log(JSON.stringify({base:config.base,head:config.head,page,nav:config.themeConfig.nav,sitemap:config.sitemap,define:config.vite.define,items:config.sitemap.transformItems([{url:'index.html'},{url:'projects/demo/index.html'},{url:'404.html'}])}));
      `], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 0, result.stderr);
      const config = JSON.parse(result.stdout);
      const origin = target === 'pages' ? env.SITE_ORIGIN : 'https://kimhg1995.github.io';
      const base = target === 'pages' ? '/' : '/work-history/';
      assert.equal(config.base, base);
      assert.equal(config.sitemap.hostname, origin + base);
      assert.deepEqual(config.items.map(i => i.url), [origin + base, origin + base + 'projects/demo/']);
      assert.ok(config.page.frontmatter.head.some(([tag, attr]) => tag === 'link' && attr.rel === 'canonical' && attr.href === origin + base + 'projects/demo/'));
      assert.equal(config.page.frontmatter.head.some(([, attr]) => attr.name === 'google-adsense-account'), target === 'pages');
      assert.ok(JSON.stringify(config.nav).includes('/privacy'));
      assert.ok(config.head.some(([tag, , source]) => tag === 'script' && source.includes(`location.origin !== ${JSON.stringify(origin)}`)));
      assert.equal(config.define['import.meta.env.VITE_CHAT_API_URL'], JSON.stringify('https://work-history-chat.kim-h-g199510.workers.dev'));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
