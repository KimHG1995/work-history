import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

// VitePress 1.6.4 passes clean URLs to transformItems, not source filenames.
// Keep filename cases too, so both the former fixtures and real hook input are covered.
for (const target of ['github', 'pages']) for (const format of ['files', 'clean']) {
  test(`${target}/${format}: VitePress metadata, sitemap, navigation and Clarity share the target`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'site-metadata-'));
    try {
      for (const folder of ['site/.vitepress', 'scripts', 'projects', 'node_modules/vitepress']) mkdirSync(path.join(dir, folder), { recursive: true });
      for (const file of ['site/.vitepress/config.mjs', 'site/chat.config.mjs', 'scripts/site-config.mjs']) cpSync(path.join(root, file), path.join(dir, file));
      writeFileSync(path.join(dir, 'node_modules/vitepress/package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
      writeFileSync(path.join(dir, 'node_modules/vitepress/index.js'), 'export const defineConfig = value => value;');
      const env = { ...process.env, SITE_TARGET: target, SITE_BASE: '', ADS_MODE: target === 'pages' ? 'verify' : 'off', ADS_PUBLISHER_ID: 'ca-pub-1234567890123456', ADS_CSP_MODE: 'strict', SITE_ORIGIN: target === 'pages' ? 'https://validation-only.pages.dev' : '', VITE_CHAT_API_URL: '' };
      const input = (format === 'clean'
        ? ['', 'projects/demo/', 'projects/demo/task', 'projects/demo/404', '프로젝트/첫 글', '404']
        : ['index.html', 'projects/demo/index.html', 'projects/demo/task.html', 'projects/demo/404.html', '프로젝트/첫 글.html', '404.html'])
        .map(url => ({ url, lastmod: '2026-09-28', priority: 0.5 }));
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        globalThis.fetch = () => { throw Error('Network access during static configuration'); };
        const config = (await import('./site/.vitepress/config.mjs')).default;
        const page = {relativePath:'projects/demo/index.md',frontmatter:{}};
        config.transformPageData(page);
        const input = ${JSON.stringify(input)};
        const items = config.sitemap.transformItems(input);
        if (JSON.stringify(input) !== ${JSON.stringify(JSON.stringify(input))}) throw Error('Sitemap input was mutated');
        console.log(JSON.stringify({base:config.base,head:config.head,page,nav:config.themeConfig.nav,sitemap:config.sitemap,define:config.vite.define,items}));
      `], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 0, result.stderr);
      const config = JSON.parse(result.stdout);
      const origin = target === 'pages' ? env.SITE_ORIGIN : 'https://kimhg1995.github.io';
      const base = target === 'pages' ? '/' : '/work-history/';
      assert.equal(config.base, base);
      assert.equal(config.sitemap.hostname, origin + base);
      assert.deepEqual(config.items.map(i => i.url), [origin + base, origin + base + 'projects/demo/', origin + base + 'projects/demo/task', origin + base + 'projects/demo/404', origin + base + encodeURIComponent('프로젝트') + '/' + encodeURIComponent('첫 글')]);
      assert.ok(config.items.every(item => item.lastmod === '2026-09-28' && item.priority === 0.5));
      assert.ok(config.page.frontmatter.head.some(([tag, attr]) => tag === 'link' && attr.rel === 'canonical' && attr.href === origin + base + 'projects/demo/'));
      assert.equal(config.page.frontmatter.head.some(([, attr]) => attr.name === 'google-adsense-account'), target === 'pages');
      assert.ok(JSON.stringify(config.nav).includes('/privacy'));
      assert.ok(config.head.some(([tag, attr]) => tag === 'link' && attr.rel === 'icon' && attr.href === `${base}favicon.png`));
      assert.ok(config.head.some(([tag, attr]) => tag === 'link' && attr.rel === 'apple-touch-icon' && attr.href === `${base}favicon.png`));
      assert.ok(config.head.some(([tag, , source]) => tag === 'script' && source.includes(`location.origin !== ${JSON.stringify(origin)}`)));
      assert.equal(config.define['import.meta.env.VITE_CHAT_API_URL'], JSON.stringify('https://work-history-chat.kim-h-g199510.workers.dev'));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
