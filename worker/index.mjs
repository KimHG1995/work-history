import { DurableObject } from 'cloudflare:workers';
import docs from './generated/docs.json';
import { verifyReceipt } from './cost.mjs';
import { reserve, finish } from './policy.mjs';
import { selectContext } from './search.mjs';
import { validateQuestion, makePayload, providerResult } from './chat.mjs';

const origin = 'https://kimhg1995.github.io';
const unavailable = { message: '지금은 AI 답변을 제공하기 어렵습니다. 관련 문서를 확인해 주세요.' };
const encode = new TextEncoder();
function json(body, status = 200) {
  return Response.json(body, { status, headers: {
    'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Expose-Headers': 'Retry-After', 'Cache-Control': 'no-store',
    ...(body.retryAfter ? { 'Retry-After': String(body.retryAfter) } : {})
  }});
}
export async function readBounded(stream, limit) {
  if (!stream) throw new Error('empty');
  const reader = stream.getReader(); const parts = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('large'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return new TextDecoder().decode(bytes);
}
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encode.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
export default {
  async fetch(request, env) {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      try { return await env.CHAT_GATE.get(env.CHAT_GATE.idFromName('global-v1')).fetch('https://internal/health'); }
      catch { return json({ready:false},503); }
    }
    if (new URL(request.url).pathname === '/admin/verify-cost') {
      // Only a deployment operator with the secret can request recovery.
      if (request.method !== 'POST' || !env.ORCAROUTER_API_KEY) return new Response(null, {status:403});
      try {
        const {id, timestamp, signature} = JSON.parse(await readBounded(request.body, 1024));
        if (!Number.isFinite(timestamp) || Math.abs(Date.now()-timestamp)>300000 || typeof id!=='string' || !/^[a-f0-9]{64}$/.test(signature)) throw new Error('invalid');
        const key = await crypto.subtle.importKey('raw', encode.encode(env.ORCAROUTER_API_KEY), {name:'HMAC',hash:'SHA-256'},false,['verify']);
        const bytes = Uint8Array.from(signature.match(/../g), x=>parseInt(x,16));
        if (!await crypto.subtle.verify('HMAC', key, bytes, encode.encode(`cost-recovery:${timestamp}:${id}`))) throw new Error('invalid');
        return await env.CHAT_GATE.get(env.CHAT_GATE.idFromName('global-v1')).fetch('https://internal/recover', {method:'POST',body:JSON.stringify({id})});
      } catch { return new Response(null,{status:403}); }
    }
    if (new URL(request.url).pathname !== '/chat') return json({message: 'Not found'}, 404);
    if (request.headers.get('Origin') !== origin) return new Response(null, {status: 403});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin'
    }});
    if (request.method !== 'POST') return json({message: 'POST only'}, 405);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({message: 'JSON required'}, 415);
    let question;
    try { question = validateQuestion(JSON.parse(await readBounded(request.body, 4096))); }
    catch (e) { return json({message: '질문을 500자 이내로 입력해 주세요.'}, e.message === 'large' ? 413 : 400); }
    const found = selectContext(question, docs);
    const sources = found.map(({title, url}) => ({title, url}));
    if (!found.length) return json({answer: '공개 문서에서 관련 내용을 찾지 못했습니다. 프로젝트명이나 기술 이름을 넣어 질문해 주세요.', sources});
    if (!env.ORCAROUTER_API_KEY) return json({...unavailable, sources}, 503);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return json({...unavailable, sources}, 503);
    try {
      const key = await crypto.subtle.importKey('raw', encode.encode(env.ORCAROUTER_API_KEY), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
      const signed = await crypto.subtle.sign('HMAC', key, encode.encode(`chat-ip:${new Date().toISOString().slice(0,10)}:${ip}`));
      const ipHash = Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2, '0')).join('');
      const stub = env.CHAT_GATE.get(env.CHAT_GATE.idFromName('global-v1'));
      return await stub.fetch('https://internal/chat', {method: 'POST', body: JSON.stringify({question, found, sources, ipHash, hash: await digest(question)})});
    } catch (error) {
      const detail=String(error?.message || '');
      const code=/CPU|cpu/.test(detail) ? 'worker_cpu_limit' : /reset|restart|disconnected|updated/i.test(detail) ? 'worker_restarting' : 'worker_internal';
      return json({...unavailable, code, sources}, 503);
    }
  }
};

export class ChatGate extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.cache = new Map(); }
  async fetch(request) {
    if (new URL(request.url).pathname === '/health') {
      await this.ctx.storage.get('policy');
      return json({ready:true,release:this.env.RELEASE_SHA || 'dev'});
    }
    if (new URL(request.url).pathname === '/recover') {
      const {id} = await request.json();
      if (!await verifyReceipt(id, this.env.ORCAROUTER_API_KEY)) return json({recovered:false},503);
      await this.ctx.storage.transaction(async txn=> {
        const state=await txn.get('policy') || {};
        await txn.put('policy',{...state,disabled:false});
      });
      return json({recovered:true});
    }
    const {question, found, sources, ipHash, hash} = await request.json();
    const now = Date.now(); const cacheKey = `${ipHash}:${hash}`;
    for (const [key, entry] of this.cache) if (entry.until <= now) this.cache.delete(key);
    const cached = this.cache.get(cacheKey);
    if (cached) return json({...cached.result, sources});
    const slot = await this.ctx.storage.transaction(async txn => {
      const previous = await txn.get('policy') || {};
      if (previous.disabled) return {ok: false, disabled: true};
      const next = reserve(previous, ipHash, hash, Date.now());
      if (next.ok) await txn.put('policy', next.state);
      return next;
    });
    if (!slot.ok) return json({message: slot.disabled ? unavailable.message : '요청이 많습니다. 잠시 후 다시 질문해 주세요.', code: slot.disabled ? 'cost_unverified' : slot.reason, retryAfter: slot.retryAfter, sources}, slot.disabled ? 503 : 429);
    let result;
    try {
      const response = await fetch('https://api.orcarouter.ai/v1/chat/completions', {
        method: 'POST', headers: {'Authorization': `Bearer ${this.env.ORCAROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-OrcaRouter-Include-Cost': 'true'},
        body: JSON.stringify(makePayload(question, found)), signal: AbortSignal.timeout(30000)
      });
      let body = {};
      try { body = JSON.parse(await readBounded(response.body, 65536)); } catch {}
      if (response.ok && body?.usage?.cost_usd == null && await verifyReceipt(response.headers.get('X-Orca-Request-Id'), this.env.ORCAROUTER_API_KEY)) {
        body.usage = {...body.usage, cost_usd:0};
      }
      result = providerResult(response.status, body, response.headers.get('Retry-After'));
    } catch { result = {ok: false, status: 503, code: 'provider_connection_failed', ...unavailable}; }
    await this.ctx.storage.transaction(async txn => {
      const state = await txn.get('policy') || {};
      const next = finish(state, slot.id, Date.now(), result.retryAfter ? Date.now() + result.retryAfter * 1000 : 0);
      if (result.disable) next.disabled = true;
      await txn.put('policy', next);
    });
    const output = result.ok ? {answer: result.answer, cost: 0} : {message: result.message, code: result.code, retryAfter: result.retryAfter};
    if (result.ok) {
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(cacheKey, {until: now + 60000, result: output});
    }
    return json({...output, sources}, result.status);
  }
}
