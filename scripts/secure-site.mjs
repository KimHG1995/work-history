import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readSiteConfig } from './site-config.mjs';
import { resolveChatApiUrl } from '../site/chat.config.mjs';

const output = path.resolve(import.meta.dirname, '../site/.vitepress/dist');
const config = readSiteConfig();
// The fallback search index must be included in the published site.
JSON.parse(await readFile(path.join(output, 'chat-docs.json'), 'utf8'));
let count = 0;
const chat = resolveChatApiUrl(process.env.VITE_CHAT_API_URL);
async function secure(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await secure(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    let html = await readFile(file, 'utf8');
    const relative = path.relative(output, file).split(path.sep).join('/');
    // VitePress emits this marker from the source eligibility check. It is part
    // of the deployable HTML so that staging/upload need no generated source.
    const marker = /<meta\b(?=[^>]*\bname=["']work-history-ad["'])(?=[^>]*\bcontent=["']enabled["'])[^>]*>/i.test(html);
    if (marker && config.adsMode !== 'enabled') throw new Error(`Ad marker in non-enabled build: ${relative}`);
    const adPage = config.adsMode === 'enabled' && marker;
    // Hash the generated inline scripts so arbitrary inline JavaScript stays blocked.
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(([, attributes, body]) => !/\bsrc\s*=/i.test(attributes) && body.trim())
      .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    const policy = [
      "default-src 'self'",
      adPage ? "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'" : `script-src 'self' https://*.clarity.ms ${[...new Set(hashes)].join(' ')}`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      adPage ? "img-src 'self' data: blob: https:" : "img-src 'self' data: blob: https://*.clarity.ms https://c.bing.com",
      "font-src 'self' data:",
      adPage ? `connect-src 'self' https: ${chat}` : `connect-src 'self' https://*.clarity.ms https://c.bing.com ${chat}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      adPage ? "frame-src https:" : "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      'upgrade-insecure-requests'
    ].join('; ');
    if (!html.includes('<head>')) throw new Error(`Missing head: ${file}`);
    // Must precede scripts and other resources to apply to the whole document.
    // Never inject AdSense at parse-time: the client gate first checks origin
    // AND visitor consent. Loading the SDK here would send a premature request.
    html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="strict-origin-when-cross-origin">`);
    await writeFile(file, html);
    count++;
  }
}
await secure(output);
console.log(`Security policy applied to ${count} HTML pages.`);
