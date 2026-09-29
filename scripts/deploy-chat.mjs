import { spawnSync } from 'node:child_process';
import { appendFile, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publicSites, documentsForSite } from '../worker/public-sites.mjs';
import { hashDocuments } from '../worker/docs-version.mjs';
const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token, ORCAROUTER_API_KEY: key, GITHUB_ENV: githubEnv } = process.env;
if (!/^[a-f0-9]{32}$/i.test(account || '')) throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID.');
if (!token || !key || !githubEnv) throw new Error('Missing deployment secrets or GitHub environment file.');
const documents = JSON.parse(await readFile(new URL('../worker/generated/docs.json', import.meta.url), 'utf8'));
const expectedDigests = new Map(await Promise.all(publicSites.map(async site => [site.origin, await hashDocuments(documentsForSite(documents, site))])));
async function cf(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)});
  const body = await response.json();
  if (!response.ok || !body.success) {
    const codes = (Array.isArray(body.errors) ? body.errors : []).map(e => e.code).filter(Number.isInteger).join(', ');
    if (path === 'subscriptions') {
      const probe = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)});
      console.log(`Read-only Workers access check: HTTP ${probe.status}.`);
    }
    throw new Error(`Cloudflare ${path}: HTTP ${response.status}, error codes ${codes || 'none'}. No deployment performed. Check token permissions and account scope.`);
  }
  return body;
}
// No subscription is the default Workers Free plan. Unknown or paid account
// subscriptions require review; deployment never upgrades or buys a plan.
const subscriptions = await cf('subscriptions');
if (!Array.isArray(subscriptions.result) || (subscriptions.result_info?.total_count || 0) > subscriptions.result.length) throw new Error('Could not verify the complete account subscription list.');
const active = subscriptions.result.filter(s => !['Cancelled', 'Expired', 'Failed'].includes(s.state));
if (active.some(s => s.rate_plan?.scope !== 'zone' && !(s.price === 0 && /^(free|workers_free)$/i.test(s.rate_plan?.id || '')))) throw new Error('Free account plan could not be confirmed. No Worker was deployed.');
console.log('Cloudflare free account plan check passed.');
const {result: subdomain} = await cf('workers/subdomain');
if (!/^[a-z0-9-]+$/.test(subdomain?.subdomain || '')) throw new Error('Set up your free workers.dev subdomain in Cloudflare first.');
function wrangler(args, input) {
  const child = spawnSync('node_modules/.bin/wrangler', args, {input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: {...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true'}});
  // Never print raw CLI output from a command that handles credentials.
  if (child.status !== 0) throw new Error(`Wrangler ${args.slice(0,2).join(' ')} failed. Check Workers Scripts Edit and Account Settings Read token permissions.`);
  console.log(`Wrangler ${args.slice(0,2).join(' ')} completed.`);
}
const release = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(release || '')) throw new Error('Missing release commit.');
const secretDirectory = await mkdtemp(path.join(tmpdir(), 'work-history-secret-'));
try {
  const secretFile = path.join(secretDirectory, 'secrets.json');
  await writeFile(secretFile, JSON.stringify({ORCAROUTER_API_KEY: key}), {mode:0o600});
  wrangler(['deploy', '--secrets-file', secretFile, '--var', `RELEASE_SHA:${release}`]);
} finally {
  await rm(secretDirectory, {recursive:true, force:true});
}
const api = `https://work-history-chat.${subdomain.subdomain}.workers.dev`;
console.log(`Chat API: ${api}`);
// Verify both production origins twice. These health reads never call the model
// or reserve rate slots. Version hashes include each site's actual source paths.
let stable = 0;
for (let attempt = 0; attempt < 12; attempt++) {
  let ready = true;
  for (const site of publicSites) {
    const probe = await fetch(`${api}/health`, {headers:{Origin:site.origin},signal:AbortSignal.timeout(10000)});
    let health = {}; try { health = await probe.json(); } catch {}
    ready = ready && probe.ok && health.ready === true && health.release === release &&
      health.docsDigest === expectedDigests.get(site.origin) && probe.headers.get('Access-Control-Allow-Origin') === site.origin;
    if (![200,404,502,503].includes(probe.status)) throw new Error(`Worker readiness failed for ${site.origin} (${probe.status}). No AI call was made.`);
  }
  stable = ready ? stable + 1 : 0;
  if (stable >= 2) break;
  await new Promise(resolve => setTimeout(resolve, 5000));
}
if (stable < 2) throw new Error('Worker release, production CORS or document version is not ready. No AI call was made.');
console.log('Worker health, CORS and document versions verified for GitHub and Pages.');
// Model availability is checked independently, never by re-deploying a healthy Worker.
console.log('Worker deployment complete. Live AI verification uses the separate AI connection-check workflow.');
await appendFile(githubEnv, `VITE_CHAT_API_URL=${api}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## AI Worker 배포 완료\n\n배포 주소: \`${api}\`\n\nGitHub와 Pages의 release, CORS와 문서 버전을 확인했습니다. 이 실행은 실제 모델을 호출하지 않습니다.\n\n실제 답변 검증은 별도 \`AI 연결 확인 (배포 없음)\`에서 수행합니다. 검증 실패가 이미 성공한 배포를 되돌리지는 않습니다. 기본 주소를 사용하면 \`VITE_CHAT_API_URL\` 등록은 필요 없습니다.\n`);
}
