import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
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
    const health=await mf.dispatchFetch('https://test/health');assert.deepEqual(await health.json(),{ready:true,release:'dev'});assert.equal(calls(),0);
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
