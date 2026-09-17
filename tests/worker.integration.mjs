import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const origin = 'https://kimhg1995.github.io';
function setup(reply) {
  let calls = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({modules:true, scriptPath:'.wrangler/test-build/index.js', compatibilityDate:'2026-09-17', bindings:{ORCAROUTER_API_KEY:'test-only-key'}, durableObjects:{CHAT_GATE:{className:'ChatGate',useSQLite:true}}, outboundService:async request => {
    calls++;
    assert.equal(request.url,'https://api.orcarouter.ai/v1/chat/completions');
    const payload=await request.json();assert.equal(payload.model,'orcarouter/free');assert.equal(payload.max_tokens,512);
    return reply();
  }}));
  const send=(question='쿠폰 시스템',extra={})=>mf.dispatchFetch('https://test/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.1',...extra},body:JSON.stringify({question})});
  return {mf,send,calls:()=>calls};
}
test('HTTP validation, parallel reservation and duplicate response cache',async()=>{
  const {mf,send,calls}=setup(()=>Response.json({usage:{cost_usd:0},choices:[{message:{content:'<script>alert(1)</script> 문서 답변'}}]}));
  try {
    assert.equal((await send('쿠폰',{Origin:'https://evil.example'})).status,403);
    assert.equal((await send('쿠폰',{'Content-Type':'text/plain'})).status,415);
    assert.equal((await send('가'.repeat(2000))).status,413);
    assert.equal((await send('내일 날씨')).status,200);assert.equal(calls(),0);
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
