import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { publicSites, documentsForSite } from '../worker/public-sites.mjs';
import { hashDocuments } from '../worker/docs-version.mjs';
async function load(file) {
  assert.ok(existsSync(new URL(`../scripts/${file}.mjs`, import.meta.url)), `${file} implementation is missing`);
  return import(`../scripts/${file}.mjs`);
}
const documents = [{ title: '쿠폰', text: '공개 문서', url: '/work-history/projects/coupon/task' }];
const api = 'https://work-history-chat.kim-h-g199510.workers.dev';
const pages = publicSites[1];
const release = 'a'.repeat(40);
async function health(site, overrides = {}) {
  return Response.json({ ready: true, release, docsDigest: await hashDocuments(documentsForSite(documents, site)), ...overrides },
    { headers: { 'Access-Control-Allow-Origin': site.origin } });
}
function transport(calls, chat) {
  return async (url, options) => {
    calls.push([url, options]);
    const site = publicSites.find(value => value.origin === options.headers.Origin);
    if (url.endsWith('/health')) return health(site);
    if (options.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': site.origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'
    } });
    return chat();
  };
}
test('normal Pages token defaults to the verified existing Secret and never chooses arbitrary secrets', async () => {
  const { resolvePagesToken } = await load('pages-token');
  for (const input of [undefined, '']) assert.equal(resolvePagesToken(input), 'CLOUDFLARE_API_TOKEN');
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_PAGES_API_TOKEN']) assert.equal(resolvePagesToken(name), name);
  for (const name of ['ORCAROUTER_API_KEY', 'GITHUB_TOKEN', ' ', 'CLOUDFLARE_API_TOKEN\n', false]) assert.throws(() => resolvePagesToken(name));
});
test('health-only verification performs no model request and needs no deployment credentials', async () => {
  const { verifyChat } = await load('verify-chat'); const calls = [];
  const result = await verifyChat({ documents, api, fetchImpl: transport(calls, () => { throw Error('unexpected model call'); }) });
  assert.equal(result.live, 'not-requested'); assert.equal(result.release, release);
  assert.deepEqual(calls.map(([,v]) => v.method), ['GET', 'GET', 'OPTIONS']);
  assert.ok(calls.every(([,v]) => v.redirect === 'error' && !('Authorization' in v.headers)));
});
test('explicit live verification sends one request and accepts only cost-zero answers with known Pages sources', async () => {
  const { verifyChat } = await load('verify-chat'); const calls = [];
  const result = await verifyChat({ documents, api, live: true, fetchImpl: transport(calls, () => Response.json({ answer: '문서 답변', cost: 0,
    sources: [{ title: '쿠폰', url: '/projects/coupon/task' }] }, { headers: { 'Access-Control-Allow-Origin': pages.origin } })) });
  assert.equal(result.live, 'passed'); assert.equal(calls.filter(([,v]) => v.method === 'POST').length, 1);
  const request = JSON.parse(calls.at(-1)[1].body);
  assert.equal(request.docsDigest, await hashDocuments(documentsForSite(documents, pages)));
  assert.equal(request.model, undefined);
});
test('provider denial is a separate failed verification, never a retry or deployment, and raw error is not logged', async () => {
  const { verifyChat } = await load('verify-chat'); const calls = [];
  await assert.rejects(verifyChat({ documents, api, live: true, fetchImpl: transport(calls, () => Response.json({ code: 'err_free_access_denied', message: 'private-token', retryAfter: 60 },
    { status: 429, headers: { 'Access-Control-Allow-Origin': pages.origin } })) }),
    error => /HTTP 429.*err_free_access_denied/.test(error.message) && !/private-token|60/.test(error.message));
  assert.equal(calls.filter(([,v]) => v.method === 'POST').length, 1);
});
test('invalid health, digest or release prevents the live request', async () => {
  const { verifyChat } = await load('verify-chat');
  for (const overrides of [{ ready: false }, { docsDigest: '0'.repeat(64) }, { release: 'dev' }]) {
    let posts = 0;
    await assert.rejects(verifyChat({ documents, api, live: true, fetchImpl: async (url, init) => {
      if (init.method === 'POST') posts++;
      return health(publicSites.find(site => site.origin === init.headers.Origin), overrides);
    } }));
    assert.equal(posts, 0);
  }
});
test('live validation rejects mismatched CORS, charge, empty answer and foreign sources', async () => {
  const { verifyChat } = await load('verify-chat');
  for (const patch of [{cost:1}, {answer:''}, {sources:[]}, {sources:[{url:'https://evil.test'}]}, {sources:[{url:'/work-history/projects/coupon/task'}]}]) {
    await assert.rejects(verifyChat({documents, api, live:true, fetchImpl:transport([], () => Response.json({answer:'답변',cost:0,sources:[{url:'/projects/coupon/task'}],...patch},
      {headers:{'Access-Control-Allow-Origin':pages.origin}}))}));
  }
  await assert.rejects(verifyChat({documents, api, live:true, fetchImpl:transport([], () => Response.json({answer:'답변',cost:0,sources:[{url:'/projects/coupon/task'}]},
    {headers:{'Access-Control-Allow-Origin':publicSites[0].origin}}))}));
});
test('invalid API and ambiguous live flags make zero verification requests', async () => {
  const { verifyChat } = await load('verify-chat'); let requests=0;
  for (const change of [{api:'https://evil.test'}, {api:'off'}, {live:'true'}, {documents:[]}]) {
    await assert.rejects(verifyChat({documents,api,...change,fetchImpl:async()=>{requests++;}}));
  }
  assert.equal(requests,0);
});
test('published-file verification compares actual bytes, only on the exact production host', async () => {
  const { verifyPublishedFiles } = await load('verify-public-site'); const calls=[];
  const files=[{route:'/',bytes:Buffer.from('<html>home</html>')},{route:'/privacy',bytes:Buffer.from('안내')}];
  const result=await verifyPublishedFiles({origin:pages.origin,files,fetchImpl:async(url,init)=>{
    calls.push([url,init]); return new Response(files.find(f=>pages.origin+f.route===url).bytes);
  }});
  assert.equal(result.checked,2); assert.ok(calls.every(([,v])=>v.method==='GET'&&v.redirect==='error'&&!v.headers.Authorization));
  let requests=0;
  for(const origin of ['https://preview.work-history-4gn.pages.dev','https://evil.test']) {
    await assert.rejects(verifyPublishedFiles({origin,files,fetchImpl:async()=>{requests++;}}));
  }
  assert.equal(requests,0);
});
test('a stale public page fails after bounded reads without uploading or hiding the mismatch', async () => {
  const { verifyPublishedFiles } = await load('verify-public-site'); let calls=0; const waits=[];
  await assert.rejects(verifyPublishedFiles({origin:pages.origin,files:[{route:'/privacy',bytes:Buffer.from('new')}],
    pause:async ms=>waits.push(ms),fetchImpl:async()=>{calls++;return new Response('old');}}),/Published content mismatch/);
  assert.equal(calls,3);assert.deepEqual(waits,[1000,2000]);
});
test('unsafe public paths cannot escape to other hosts or parent paths', async () => {
  const { verifyPublishedFiles } = await load('verify-public-site');let calls=0;
  for(const route of ['//evil.test','/../secret','/a/./b','/p?x=y','/x#hash','/x\\y','/%2e%2e']) {
    await assert.rejects(verifyPublishedFiles({origin:pages.origin,files:[{route,bytes:Buffer.from('x')}],fetchImpl:async()=>{calls++;}}));
  }
  assert.equal(calls,0);
});
