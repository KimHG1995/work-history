import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token, ORCAROUTER_API_KEY: key, GITHUB_ENV: githubEnv } = process.env;
if (!/^[a-f0-9]{32}$/i.test(account || '')) throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID.');
if (!token || !key || !githubEnv) throw new Error('Missing deployment secrets or GitHub environment file.');
async function cf(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)});
  const body = await response.json();
  if (!response.ok || !body.success) {
    const codes = (Array.isArray(body.errors) ? body.errors : []).map(e => e.code).filter(Number.isInteger).join(', ') || 'none';
    if (path === 'subscriptions') {
      const probe = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)});
      console.log(`Read-only Workers access check: HTTP ${probe.status}.`);
    }
    throw new Error(`Cloudflare ${path}: HTTP ${response.status}, error codes ${codes}. No deployment performed. Check token permissions and account scope.`);
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
wrangler(['deploy']);
wrangler(['secret', 'bulk'], JSON.stringify({ORCAROUTER_API_KEY: key}));
const api = `https://work-history-chat.${subdomain.subdomain}.workers.dev`;
console.log(`Chat API: ${api}`);
// A new workers.dev route may not be available immediately after deployment.
// GET never calls AI; wait for the route before making the single live call.
let ready = false;
for (let attempt = 0; attempt < 12; attempt++) {
  const probe = await fetch(`${api}/chat`, {headers: {Origin: 'https://kimhg1995.github.io'}, signal: AbortSignal.timeout(10000)});
  if (probe.status === 405) { ready = true; break; }
  if (![404, 502, 503].includes(probe.status)) throw new Error(`Worker readiness failed (${probe.status}).`);
  await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!ready) throw new Error('Worker route is not ready. No AI call was made.');
// Exactly one live free call. A failure leaves the existing Pages site intact.
const response = await fetch(`${api}/chat`, {method: 'POST', headers: {Origin: 'https://kimhg1995.github.io', 'Content-Type': 'application/json'}, body: JSON.stringify({question: '쿠폰 시스템은 어떻게 개발했나요?'}), signal: AbortSignal.timeout(35000)});
let body = {}; try { body = await response.json(); } catch {}
if (!response.ok || body.cost !== 0 || typeof body.answer !== 'string' || !body.answer) throw new Error(`Free response verification failed (${response.status}, code: ${body.code || 'not provided'}, retryAfter: ${body.retryAfter || 0}s). No automatic retry or paid fallback. Pages deployment stopped.`);
console.log('Live response verified: reported cost USD 0.');
await appendFile(githubEnv, `VITE_CHAT_API_URL=${api}\n`);
