import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicSites } from '../worker/public-sites.mjs';

const safePath = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
  !/[\\%?#\s]/u.test(value) && !value.split('/').some(part => part === '..' || part === '.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function bodyBytes(response) {
  if (!response.body) throw new Error('Empty public response');
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('Public response is too large'); }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}

/** GET only, bounded propagation checks after deployment; does not execute analytics or ad scripts. */
export async function verifyPublishedFiles({ origin, files, fetchImpl = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!publicSites.some(site => site.base === '/' && site.origin === origin) || !Array.isArray(files) || !files.length || files.length > 10 ||
      files.some(file => !safePath(file?.route) || !Buffer.isBuffer(file.bytes))) throw new Error('Invalid public verification inputs');
  const propagationDelays = [1000, 2000, 4000, 8000, 15000];
  for (const file of files) {
    const expected = hash(file.bytes); let matched = false;
    for (let attempt = 0; attempt <= propagationDelays.length; attempt++) {
      try {
        const response = await fetchImpl(origin + file.route, { method: 'GET', redirect: 'error', cache: 'no-store',
          signal: AbortSignal.timeout(10000), headers: { 'Cache-Control': 'no-cache' } });
        if (response.status === 200 && hash(await bodyBytes(response)) === expected) { matched = true; break; }
        await response.body?.cancel().catch(() => {});
      } catch { /* A read may be retried, never an upload. Raw remote errors stay private. */ }
      if (attempt < propagationDelays.length) await pause(propagationDelays[attempt]);
    }
    if (!matched) throw new Error(`Published content mismatch or unavailable: ${file.route}. Upload is not rolled back.`);
  }
  return { checked: files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.env.GITHUB_REF !== 'refs/heads/main' || !['push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) throw new Error('Public check is allowed only after a main deployment');
    const { validateDeployment } = await import('./pages-config.mjs');
    const [metadata, output] = process.argv.slice(2);
    if (!metadata || !output) throw new Error('Expected deployment metadata and artifact directory');
    const record = validateDeployment(JSON.parse(await readFile(metadata, 'utf8')), process.env.GITHUB_SHA);
    if (record.siteEnv.SITE_TARGET !== 'pages') throw new Error('Expected Pages deployment');
    const root = path.resolve(output); const files = [];
    const add = async (route, filename) => {
      if (!safePath(route) || !safePath('/' + filename)) throw new Error('Unsafe artifact path');
      files.push({ route, bytes: await readFile(path.join(root, filename)) });
    };
    await add('/', 'index.html'); await add('/about', 'about.html'); await add('/privacy', 'privacy.html');
    for (const file of ['sitemap.xml','robots.txt','chat-docs.json']) await add('/' + file, file);
    const docs = JSON.parse(files.find(file => file.route === '/chat-docs.json').bytes.toString('utf8'));
    const detail = docs.find(doc => typeof doc.url === 'string' && doc.url.startsWith('/projects/') && !doc.url.endsWith('/'))?.url;
    if (detail) await add(detail, detail.slice(1) + '.html');
    const home = files[0].bytes.toString('utf8');
    for (const expression of [/href="(\/assets\/[^"?#]+\.css)"/, /src="(\/assets\/[^"?#]+\.js)"/]) {
      const route = home.match(expression)?.[1]; if (route) await add(route, route.slice(1));
    }
    if (record.siteEnv.ADS_MODE === 'verify') await add('/ads.txt', 'ads.txt');
    const result = await verifyPublishedFiles({ origin: record.siteEnv.SITE_ORIGIN, files });
    const message = `Published Pages content verified: ${result.checked} files match this deployment artifact. No AI, analytics or ad request was made.`;
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## 공개 페이지 HTTP 확인\n\n${message}\n화면 배치, 사용자 탐색과 Clarity 수집은 별도 확인 항목입니다.\n`);
  } catch (error) { console.error(String(error.message).slice(0, 500)); process.exitCode = 1; }
}
