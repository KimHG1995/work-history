import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { readSiteConfig, pageUrl } from '../scripts/site-config.mjs';
import { verifySiteOutput } from '../scripts/verify-site-output.mjs';

async function fixture(verify = false) {
  const config = readSiteConfig(verify ? { SITE_TARGET: 'pages', SITE_ORIGIN: 'https://validation-only.pages.dev', ADS_MODE: 'verify', ADS_PUBLISHER_ID: 'ca-pub-1234567890123456' } : {});
  const dir = await mkdtemp(path.join(tmpdir(), 'site-output-'));
  const files = ['index.html', 'about.html', 'privacy.html', '404.html'];
  const pages = new Map();
  for (const file of files) {
    const url = pageUrl(config, file);
    const html = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src 'none'">${url ? `<link rel="canonical" href="${url}">` : '<meta name="robots" content="noindex">'}${url && verify ? `<meta name="google-adsense-account" content="${config.publisherId}">` : ''}</head><body>content</body></html>`;
    pages.set(file, html); await writeFile(path.join(dir, file), html);
  }
  const locations = files.map(file => pageUrl(config, file)).filter(Boolean);
  await writeFile(path.join(dir, 'sitemap.xml'), `<?xml version="1.0"?><urlset>${locations.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
  await writeFile(path.join(dir, 'chat-docs.json'), JSON.stringify([{ url: config.base }]));
  if (verify) {
    await writeFile(path.join(dir, 'ads.txt'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    await writeFile(path.join(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);
  }
  return { config, dir, pages, put: (file, body) => writeFile(path.join(dir, file), body), close: () => rm(dir, { recursive: true, force: true }) };
}

test('generated HTML, sitemap and verification assets agree on both targets', async () => {
  for (const verify of [false, true]) {
    const f = await fixture(verify);
    try { assert.equal(await verifySiteOutput(f.dir, f.config), 4); }
    finally { await f.close(); }
  }
});

test('stale verification identity is rejected in off output', async () => {
  const f = await fixture();
  try {
    await f.put('ads.txt', 'stale-publisher');
    await assert.rejects(() => verifySiteOutput(f.dir, f.config), /ads.txt/);
  } finally { await f.close(); }
});

test('wrong canonical, wrong corpus base and wrong sitemap cannot pass verification', async () => {
  for (const kind of ['canonical', 'corpus', 'sitemap']) {
    const f = await fixture();
    try {
      if (kind === 'canonical') await f.put('index.html', f.pages.get('index.html').replace(f.config.origin + f.config.base, 'https://wrong.test/'));
      if (kind === 'corpus') await f.put('chat-docs.json', JSON.stringify([{ url: '/wrong/' }]));
      if (kind === 'sitemap') await f.put('sitemap.xml', '<urlset><url><loc>https://wrong.test/</loc></url></urlset>');
      await assert.rejects(() => verifySiteOutput(f.dir, f.config));
    } finally { await f.close(); }
  }
});

test('verify cannot ship an advertising loader or lose strict CSP', async () => {
  for (const change of [html => html.replace('</head>', '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script></head>'), html => html.replace("frame-src 'none'", 'frame-src *')]) {
    const f = await fixture(true);
    try { await f.put('index.html', change(f.pages.get('index.html'))); await assert.rejects(() => verifySiteOutput(f.dir, f.config)); }
    finally { await f.close(); }
  }
});
