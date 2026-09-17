import test from 'node:test';
import assert from 'node:assert/strict';
import { reserve, finish } from '../worker/policy.mjs';
import { search } from '../worker/search.mjs';
import { validateQuestion, makePayload, providerResult } from '../worker/chat.mjs';

test('limits survive serialization, concurrent slots expire, and failed calls retain rate usage',()=>{
 let state={}; let a=reserve(state,'a','q1',100000);assert.equal(a.ok,true);state=a.state;
 assert.equal(reserve(state,'b','q2',100001).ok,false);
 let b=reserve(state,'b','q2',101000);assert.equal(b.ok,true);
 assert.equal(reserve(b.state,'c','q3',102000).retryAfter,43);
 state=finish(JSON.parse(JSON.stringify(b.state)),a.id,102000);
 assert.equal(reserve(state,'a','different',103000).ok,false);
 assert.equal(reserve(state,'c','q3',147000).ok,true);
});
test('global minute cap and same-IP minute cap',()=>{
 let s={};for(let i=0;i<8;i++){const r=reserve(s,'ip'+i,'q',100000+i*1100);assert.ok(r.ok);s=finish(r.state,r.id,100001+i*1100);}
 assert.equal(reserve(s,'last','q',110000).ok,false);
 assert.ok(reserve(s,'last','q',161000).ok);
 s={};for(let i=0;i<3;i++){const r=reserve(s,'same','q'+i,100000+i*11000);assert.ok(r.ok);s=finish(r.state,r.id,100001+i*11000);}
 assert.equal(reserve(s,'same','q4',133000).ok,false);
});
test('duplicate requests do not reserve a new call and provider cooldown persists',()=>{
 let a=reserve({},'a','q',100000);assert.equal(reserve(a.state,'a','q',112000).reason,'duplicate');
 let s=finish(a.state,a.id,100001,200000);assert.equal(reserve(s,'b','q',150000).retryAfter,50);
});
test('question validation and free-only payload ignore untrusted options',()=>{
 assert.throws(()=>validateQuestion({question:'x',model:'paid'}));
 assert.throws(()=>validateQuestion({question:'x'.repeat(501)}));
 const q=validateQuestion({question:' 정산 작업 '});assert.equal(q,'정산 작업');
 const p=makePayload(q,[{title:'정산',text:'급여 처리',url:'/work-history/projects/settlement'}]);
 assert.equal(p.model,'orcarouter/free');assert.equal(p.max_tokens,512);assert.equal(p.tools,undefined);assert.equal(p.extra_body,undefined);
});
test('search finds Korean topic with particles and excludes unrelated questions',()=>{
 const docs=[{title:'급여 정산',text:'출퇴근 기록으로 급여를 정산했다.',url:'/a'},{title:'쿠폰 이벤트',text:'구매 이력 ID로 중복 발송을 방지했다.',url:'/b'}];
 assert.equal(search('쿠폰은 어떻게 개발했어?',docs)[0].url,'/b');
 assert.deepEqual(search('내일 날씨',docs),[]);
});
test('provider failures never expose raw messages, missing or nonzero cost is rejected',()=>{
 assert.equal(providerResult(400,{error:{metadata:{reason:'err_free_prompt_cap'}}},null).code,'err_free_prompt_cap');
 assert.equal(providerResult(429,{error:{code:'free_rate_limited',metadata:{reason:'err_free_access_denied'}}},null).code,'err_free_access_denied');
 assert.equal(providerResult(429,{error:{message:'secret',metadata:{retry_after_seconds:30}}},null).retryAfter,30);
 assert.equal(providerResult(200,{choices:[{message:{content:'답변'}}],usage:{cost_usd:0}},null).answer,'답변');
 assert.equal(providerResult(200,{choices:[{message:{content:'답변'}}]},null).ok,false);
 assert.equal(providerResult(200,{usage:{cost_usd:1}},null).ok,false);
});
