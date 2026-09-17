import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const output = path.resolve(import.meta.dirname, '../site/.vitepress/dist');
let count = 0;
async function secure(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await secure(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    let html = await readFile(file, 'utf8');
    // Hash the generated inline scripts so arbitrary inline JavaScript stays blocked.
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(([, attributes, body]) => !/\bsrc\s*=/i.test(attributes) && body.trim())
      .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    const policy = [
      "default-src 'self'",
      `script-src 'self' https://*.clarity.ms ${[...new Set(hashes)].join(' ')}`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.clarity.ms https://c.bing.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clarity.ms https://c.bing.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      'upgrade-insecure-requests'
    ].join('; ');
    if (!html.includes('<head>')) throw new Error(`Missing head: ${file}`);
    // Must precede scripts and other resources to apply to the whole document.
    html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="strict-origin-when-cross-origin">`);
    await writeFile(file, html);
    count++;
  }
}
await secure(output);
console.log(`Security policy applied to ${count} HTML pages.`);
