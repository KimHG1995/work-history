import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveChatApiUrl } from '../site/chat.config.mjs';
import { publicSites, documentsForSite } from '../worker/public-sites.mjs';
import { hashDocuments } from '../worker/docs-version.mjs';

const safeCodes = new Set(['err_free_access_denied', 'err_free_rate', 'err_free_prompt_cap', 'docs_outdated', 'cost_unverified', 'empty_answer']);
async function readJson(response) {
  if (!response.body) throw new Error('Verification response is empty');
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw new Error('Verification response exceeds size limit'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new Error('Verification response is invalid or too large'); }
  finally { reader.releaseLock(); }
}

/** Separate read-only health check and explicitly selected single free-model probe. */
export async function verifyChat({ documents, api, live = false, fetchImpl = fetch }) {
  const origin = resolveChatApiUrl(api);
  if (!origin || typeof live !== 'boolean' || !Array.isArray(documents) || !documents.length) throw new Error('Invalid AI verification inputs');
  const digests = new Map(await Promise.all(publicSites.map(async site => [site.origin, await hashDocuments(documentsForSite(documents, site))])));
  async function request(route, site, method = 'GET', body) {
    try {
      return await fetchImpl(origin + route, { method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(method === 'POST' ? 35000 : 10000),
        headers: { Origin: site.origin, ...(method === 'OPTIONS' ? { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new Error(`AI ${method} verification connection failed; no automatic retry or deployment`); }
  }
  let release;
  for (const site of publicSites) {
    const response = await request('/health', site);
    if (!response.ok || response.headers.get('Access-Control-Allow-Origin') !== site.origin) throw new Error(`AI health HTTP ${response.status} or CORS mismatch`);
    const health = await readJson(response);
    if (!health || health.ready !== true || health.docsDigest !== digests.get(site.origin) ||
        typeof health.release !== 'string' || health.release.length !== 40 || !/^[a-f0-9]{40}$/.test(health.release) || /^0+$/.test(health.release) ||
        (release && release !== health.release)) throw new Error('AI health release or document version mismatch');
    release = health.release;
  }
  const site = publicSites.find(value => value.base === '/');
  const preflight = await request('/chat', site, 'OPTIONS');
  if (preflight.status !== 204 || preflight.headers.get('Access-Control-Allow-Origin') !== site.origin ||
      !preflight.headers.get('Access-Control-Allow-Methods')?.split(',').some(value => value.trim() === 'POST') ||
      !preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase().split(',').some(value => value.trim() === 'content-type')) throw new Error('AI preflight verification failed');
  if (!live) return { release, live: 'not-requested' };
  const response = await request('/chat', site, 'POST', { question: '쿠폰 시스템은 어떻게 개발했나요?', docsDigest: digests.get(site.origin) });
  const result = await readJson(response);
  if (!response.ok) {
    const code = safeCodes.has(result?.code) ? result.code : 'unclassified';
    throw new Error(`AI live verification failed: HTTP ${response.status}, code=${code}. Deployment unchanged; no retry or paid fallback.`);
  }
  const urls = new Set(documentsForSite(documents, site).map(document => document.url));
  if (!result || response.headers.get('Access-Control-Allow-Origin') !== site.origin || result.cost !== 0 || typeof result.answer !== 'string' || !result.answer.trim() ||
      !Array.isArray(result.sources) || !result.sources.length || result.sources.some(source => !source || !urls.has(source.url))) throw new Error('AI live response cost, answer, CORS or sources failed verification');
  return { release, live: 'passed' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let message;
  try {
    if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || process.env.GITHUB_REF !== 'refs/heads/main' || process.env.CHAT_CHECK_CONFIRMED !== 'true' ||
        !['true','false'].includes(process.env.CHAT_VERIFY_LIVE)) throw new Error('Confirm a manual AI check on main');
    const documents = JSON.parse(await readFile(new URL('../worker/generated/docs.json', import.meta.url), 'utf8'));
    const result = await verifyChat({ documents, api: process.env.VITE_CHAT_API_URL, live: process.env.CHAT_VERIFY_LIVE === 'true' });
    message = `AI health, CORS and document versions passed. Release: ${result.release}. Live check: ${result.live}. No deployment performed.`;
    console.log(message);
  } catch (error) {
    message = String(error.message).slice(0, 500); console.error(message); process.exitCode = 1;
  }
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## AI 연결 확인 (배포 없음)\n\n${message}\n`);
}
