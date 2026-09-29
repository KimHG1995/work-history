import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import { hashDocuments } from '../worker/docs-version.mjs';
const docsDigest = await hashDocuments(JSON.parse(readFileSync('worker/generated/docs.json', 'utf8')));
const origin = 'https://kimhg1995.github.io';
function setup(reply) {
  let calls = 0; let lastPayload;
  const mf = new Miniflare(convertV4MiniflareOptions({modules:true, scriptPath:'.wrangler/test-build/index.js', compatibilityDate:'2026-09-17', bindings:{ORCAROUTER_API_KEY:'test-only-key'}, durableObjects:{CHAT_GATE:{className:'ChatGate',useSQLite:true}}, outboundService:async request => {
    if (new URL(request.url).pathname === '/v1/generation') return reply(request);
    calls++;
    assert.equal(request.url,'https://api.orcarouter.ai/v1/chat/completions');
    const payload=await request.json();lastPayload=payload;assert.equal(payload.model,'orcarouter/free');assert.equal(payload.max_tokens,512);
    return reply(request);
  }}));
  const send=(question='쿠폰 시스템',extra={})=>mf.dispatchFetch('https://test/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.1',...extra},body:JSON.stringify({question})});
  return {mf,send,calls:()=>calls,payload:()=>lastPayload};
}
test('HTTP validation, parallel reservation and duplicate response cache',async()=>{
  const {mf,send,calls}=setup(()=>Response.json({usage:{cost_usd:0},choices:[{message:{content:'<script>alert(1)</script> 문서 답변'}}]}));
  try {
    const health=await mf.dispatchFetch('https://test/health');assert.deepEqual(await health.json(),{ready:true,release:'dev',docsDigest});assert.equal(calls(),0);
    assert.equal((await send('쿠폰',{Origin:'https://evil.example'})).status,403);
    assert.equal((await send('쿠폰',{'Content-Type':'text/plain'})).status,415);
    assert.equal((await send('가'.repeat(2000))).status,413);
    assert.equal(calls(),0);
    const results=await Promise.all(Array.from({length:8},()=>send()));
    assert.equal(calls(),1);assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,429].includes(r.status)));
    const cached=await send();assert.equal(cached.status,200);assert.equal(calls(),1);
    const body=await cached.json();assert.equal(body.cost,0);assert.ok(body.sources[0].url.startsWith('/work-history/'));
    assert.equal((await send('정산 시스템')).status,429);assert.equal(calls(),1);
  } finally {await mf.dispose();}
});
test('provider cooldown blocks other visitors without retrying upstream',async()=>{
  const {mf,send,calls}=setup(()=>Response.json({error:{message:'private upstream error'}},{status:429,headers:{'Retry-After':'120'}}));
  try {
    const first=await send();assert.equal(first.status,429);assert.equal(first.headers.get('Retry-After'),'120');
    const next=await send('정산',{'CF-Connecting-IP':'203.0.113.2'});assert.equal(next.status,429);assert.equal(calls(),1);assert.ok(!(await next.text()).includes('private'));
  } finally {await mf.dispose();}
});
test('missing cost permanently disables further AI calls',async()=>{
  const {mf,send,calls}=setup(()=>Response.json({choices:[{message:{content:'answer'}}]}));
  try {
    assert.equal((await send()).status,503);
    assert.equal((await send('정산',{'CF-Connecting-IP':'203.0.113.2'})).status,503);assert.equal(calls(),1);
  } finally {await mf.dispose();}
});

test('receipt verifies a response without inline cost and unsigned recovery is refused',async()=>{
 const {mf,send,calls}=setup(request=>request.method==='GET' ? Response.json({data:{total_cost:0,cost_currency:'USD'}}) : Response.json({choices:[{message:{content:'정산 확인 답변'}}]},{headers:{'X-Orca-Request-Id':'receipt-1'}}));
 try {
  const response=await send();assert.equal(response.status,200);assert.equal((await response.json()).cost,0);assert.equal(calls(),1);
  const recovery=await mf.dispatchFetch('https://test/admin/verify-cost',{method:'POST',body:JSON.stringify({id:'receipt-1',timestamp:Date.now(),signature:'0'.repeat(64)})});
  assert.equal(recovery.status,403);
 }finally{await mf.dispose();}
});
test('signed zero-cost receipt recovers disabled state while keeping rate counters',async()=>{
 const {createHmac}=await import('node:crypto');
 const {mf,send,calls}=setup(request=>request.method==='GET' ? Response.json({data:{total_cost:0,cost_currency:'USD'}}) : Response.json({choices:[{message:{content:'answer'}}]}));
 try {
  assert.equal((await send()).status,503);
  const id='verified-receipt',timestamp=Date.now();
  const signature=createHmac('sha256','test-only-key').update(`cost-recovery:${timestamp}:${id}`).digest('hex');
  const response=await mf.dispatchFetch('https://test/admin/verify-cost',{method:'POST',body:JSON.stringify({id,timestamp,signature})});
  assert.equal(response.status,200);assert.equal((await response.json()).recovered,true);
  assert.equal((await send('정산 시스템')).status,429);assert.equal(calls(),1);
 }finally{await mf.dispose();}
});

test('natural career question reaches AI with all documented periods',async()=>{
 const {mf,send,payload}=setup(()=>Response.json({usage:{cost_usd:0},choices:[{message:{content:'인턴 포함 약 4년 9개월입니다.'}}]}));
 try {
  const response=await send('총 경력이 궁금해');assert.equal(response.status,200);
  const context=payload().messages[1].content;
  for(const period of ['2020-12','2021-07','2024-01','2025-10','2025-11 ~ 현재'])assert.ok(context.includes(period));
 }finally{await mf.dispose();}
});

test('index mismatch is rejected before model use while matching versions work', async () => {
  const {mf, calls} = setup(() => Response.json({usage:{cost_usd:0},choices:[{message:{content:'verified'}}]}));
  const sendVersion = version => mf.dispatchFetch('https://test/chat', {
    method:'POST', headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.4'},
    body:JSON.stringify({question:'쿠폰 시스템',docsDigest:version})
  });
  try {
    const mismatch = await sendVersion('0'.repeat(64));
    assert.equal(mismatch.status, 409);
    assert.equal((await mismatch.json()).code, 'docs_outdated');
    assert.equal(calls(), 0);
    const matching = await sendVersion(docsDigest);
    assert.equal(matching.status, 200);
    assert.equal(calls(), 1);
  } finally { await mf.dispose(); }
});

const pagesOrigin = JSON.parse(readFileSync('site/pages.project.json', 'utf8')).origin;
const pagesDocs = JSON.parse(readFileSync('worker/generated/docs.json', 'utf8')).map(doc => ({
  ...doc, url: doc.url.startsWith('/work-history/') ? doc.url.slice('/work-history'.length) : doc.url
}));
const pagesDigest = await hashDocuments(pagesDocs);

test('both production origins get matching health and preflight without model requests', async () => {
  const {mf,calls} = setup(() => { throw Error('No model call is allowed'); });
  try {
    for (const [siteOrigin,version] of [[origin,docsDigest],[pagesOrigin,pagesDigest]]) {
      const health = await mf.dispatchFetch('https://test/health', {headers:{Origin:siteOrigin,'X-Public-Origin':'https://evil.example'}});
      assert.equal(health.status,200);
      assert.equal(health.headers.get('Access-Control-Allow-Origin'),siteOrigin);
      assert.match(health.headers.get('Vary'),/Origin/);
      assert.equal((await health.json()).docsDigest,version);
      const preflight = await mf.dispatchFetch('https://test/chat', {method:'OPTIONS',headers:{Origin:siteOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}});
      assert.equal(preflight.status,204);
      assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),siteOrigin);
      assert.equal(preflight.headers.get('Access-Control-Allow-Methods'),'POST');
    }
    assert.notEqual(pagesDigest,docsDigest);
    for (const siteOrigin of ['null','https://evil.example','https://other.pages.dev',pagesOrigin.replace('https://','https://preview.')]) {
      for (const [route,method] of [['health','GET'],['chat','OPTIONS']]) {
        const reply = await mf.dispatchFetch(`https://test/${route}`, {method,headers:{Origin:siteOrigin}});
        assert.equal(reply.status,403);
        assert.equal(reply.headers.get('Access-Control-Allow-Origin'),null);
      }
    }
    assert.equal(calls(),0);
  } finally { await mf.dispose(); }
});

test('Pages requests use their own digest and source paths while sharing cache and rate limits', async () => {
  const {mf,send,calls} = setup(() => Response.json({usage:{cost_usd:0},choices:[{message:{content:'공개 문서 답변'}}]}));
  const pagesRequest = version => mf.dispatchFetch('https://test/chat', {
    method:'POST',headers:{Origin:pagesOrigin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.1'},
    body:JSON.stringify({question:'쿠폰 시스템',docsDigest:version})
  });
  try {
    const mismatch = await pagesRequest(docsDigest);
    assert.equal(mismatch.status,409);
    assert.equal(mismatch.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
    assert.equal((await mismatch.json()).code,'docs_outdated');
    assert.equal(calls(),0);
    const first = await pagesRequest(pagesDigest);
    assert.equal(first.status,200);
    assert.equal(first.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
    const firstBody = await first.json();
    assert.equal(firstBody.cost,0);
    assert.ok(firstBody.sources.length > 0);
    assert.ok(firstBody.sources.every(source => source.url.startsWith('/') && !source.url.startsWith('/work-history/')));
    const githubCached = await send();
    assert.equal(githubCached.status,200);
    assert.equal(githubCached.headers.get('Access-Control-Allow-Origin'),origin);
    assert.ok((await githubCached.json()).sources.every(source => source.url.startsWith('/work-history/')));
    assert.equal(calls(),1);
    const limited = await send('정산 시스템');
    assert.equal(limited.status,429);
    assert.equal(limited.headers.get('Access-Control-Allow-Origin'),origin);
    const pagesLimited = await send('정산 시스템',{Origin:pagesOrigin});
    assert.equal(pagesLimited.status,429);
    assert.equal(pagesLimited.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
    assert.equal(calls(),1);
  } finally { await mf.dispose(); }
});

test('Pages validation and provider errors keep the correct CORS and hide private messages', async () => {
  for (const upstreamStatus of [429,500]) {
    const {mf,send,calls} = setup(() => Response.json({error:{message:'private upstream token'}},{status:upstreamStatus,headers:{'Retry-After':'120'}}));
    try {
      for (const [question,extra,status] of [['',{},400],['쿠폰',{'Content-Type':'text/plain'},415],['가'.repeat(2000),{},413]]) {
        const invalid = await send(question,{Origin:pagesOrigin,...extra});
        assert.equal(invalid.status,status);
        assert.equal(invalid.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
      }
      assert.equal(calls(),0);
      const failed = await send('쿠폰 시스템',{Origin:pagesOrigin});
      assert.equal(failed.status,upstreamStatus === 429 ? 429 : 503);
      assert.equal(failed.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
      if (upstreamStatus === 429) assert.equal(failed.headers.get('Retry-After'),'120');
      assert.doesNotMatch(await failed.text(),/private upstream token/);
      assert.equal(calls(),1);
    } finally { await mf.dispose(); }
  }
});
