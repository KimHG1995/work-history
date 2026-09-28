import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSiteConfig, pageUrl } from './site-config.mjs';

async function exists(file) {
  try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];

/** Offline assertions on built files, not a live advertisement or cloud call. */
export async function verifySiteOutput(output, config) {
  const read = file => readFile(path.join(output, file), 'utf8');
  for (const file of ['index.html', 'about.html', 'privacy.html', '404.html']) assert.ok(await exists(path.join(output, file)), `Missing ${file}`);
  const locations = [];
  let count = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Static output must not contain symlinks');
      if (entry.isDirectory()) { await walk(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const relative = path.relative(output, file).split(path.sep).join('/');
      const html = await read(relative);
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
      assert.ok(head, `Missing head: ${relative}`);
      const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).filter(tag => attribute(tag, 'rel') === 'canonical');
      const expected = pageUrl(config, relative);
      assert.equal(canonical.length, expected ? 1 : 0, `canonical count: ${relative}`);
      if (expected) { assert.equal(attribute(canonical[0], 'href'), expected, `canonical: ${relative}`); locations.push(expected); }
      const accounts = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]).filter(tag => attribute(tag, 'name') === 'google-adsense-account');
      assert.equal(accounts.length, expected && config.adsMode === 'verify' ? 1 : 0, `publisher metadata: ${relative}`);
      if (accounts.length) assert.equal(attribute(accounts[0], 'content'), config.publisherId);
      assert.ok(head.includes('Content-Security-Policy') && head.includes("frame-src 'none'"), `strict CSP: ${relative}`);
      assert.doesNotMatch(html, /<script\b[^>]*src=["'][^"']*(?:adsbygoogle|googlesyndication|doubleclick)|<ins\b[^>]*adsbygoogle/i, `advertising code in verify-only output: ${relative}`);
      count++;
    }
  }
  await walk(output);
  const sitemap = [...(await read('sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual([...new Set(sitemap)].sort(), locations.sort(), 'sitemap must match canonical pages');
  const corpus = JSON.parse(await read('chat-docs.json'));
  assert.ok(Array.isArray(corpus) && corpus.every(doc => typeof doc.url === 'string' && doc.url.startsWith(config.base)), 'chat index base');
  if (config.adsMode === 'verify') assert.equal(await read('ads.txt'), `google.com, ${config.publisherId.slice(3)}, DIRECT, f08c47fec0942fa0\n`, 'ads.txt');
  else assert.equal(await exists(path.join(output, 'ads.txt')), false, 'off output still contains ads.txt');
  if (config.target === 'pages') assert.ok((await read('robots.txt')).includes(`Sitemap: ${config.origin}/sitemap.xml`), 'robots sitemap');
  else assert.equal(await exists(path.join(output, 'robots.txt')), false, 'GitHub project path must not pretend to own root robots.txt');
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const count = await verifySiteOutput(path.resolve(import.meta.dirname, '../site/.vitepress/dist'), readSiteConfig());
  console.log(`Static output verified: ${count} HTML pages, canonical, sitemap, public pages and advertising mode.`);
}
