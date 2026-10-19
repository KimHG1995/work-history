import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { readSiteConfig, pageUrl } from '../scripts/site-config.mjs';
import { verifySiteOutput } from '../scripts/verify-site-output.mjs';

test('enabled deployment artifact validates without generated site/content', async () => {
  const config = readSiteConfig({
    SITE_TARGET: 'pages', SITE_ORIGIN: 'https://work-history-4gn.pages.dev',
    ADS_MODE: 'enabled', ADS_CSP_MODE: 'static-ads',
    ADS_PUBLISHER_ID: 'ca-pub-9486681340475427', ADS_SLOT_ID: '4869544605',
    ADS_CMP_CONFIRMED: 'true'
  });
  const root = await mkdtemp(path.join(tmpdir(), 'ads-dist-only-'));
  try {
    const htmlFiles = ['index.html', 'about.html', 'privacy.html', '404.html', 'projects/index.html', 'projects/demo/task.html'];
    const locs = [];
    for (const file of htmlFiles) {
      const url = pageUrl(config, file);
      const ad = file === 'projects/demo/task.html';
      if (url) locs.push(url);
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file),
        `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src ${ad ? 'https:' : "'none'"}">` +
        (url ? `<link rel="canonical" href="${url}"><meta name="google-adsense-account" content="${config.publisherId}">` : '<meta name="robots" content="noindex">') +
        (ad ? '<meta name="work-history-ad" content="enabled">' : '') +
        '</head><body>description</body></html>');
    }
    await writeFile(path.join(root, 'sitemap.xml'), '<urlset>' + locs.map(url => `<url><loc>${url}</loc></url>`).join('') + '</urlset>');
    await writeFile(path.join(root, 'chat-docs.json'), '[{"url":"/"}]');
    await writeFile(path.join(root, 'ads.txt'), 'google.com, pub-9486681340475427, DIRECT, f08c47fec0942fa0\n');
    await writeFile(path.join(root, 'robots.txt'), 'Sitemap: https://work-history-4gn.pages.dev/sitemap.xml\n');
    assert.equal(await verifySiteOutput(root, config), 6);
    const indexPath = path.join(root, 'projects/index.html');
    const original = await readFile(indexPath, 'utf8');
    await writeFile(indexPath, original.replace('</head>', '<meta name="work-history-ad" content="enabled"></head>'));
    await assert.rejects(() => verifySiteOutput(root, config), /excluded advertising route|CSP/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
