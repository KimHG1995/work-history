import { createHmac } from 'node:crypto';
const key = process.env.ORCAROUTER_API_KEY;
if (!key) throw new Error('Missing API secret.');
const response = await fetch('https://api.orcarouter.ai/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','X-OrcaRouter-Include-Cost':'true'},body:JSON.stringify({model:'orcarouter/free',messages:[{role:'user',content:'한국어로 연결 확인이라고만 답하세요.'}],max_tokens:16,stream:false}),signal:AbortSignal.timeout(30000)});
const body = await response.json();
console.log(JSON.stringify({status:response.status,fields:Object.keys(body),usage:body.usage,reason:body.error?.metadata?.reason}));
const id = response.headers.get('X-Orca-Request-Id');
if (response.ok && id) {
  await new Promise(resolve=>setTimeout(resolve,2000));
  const receipt = await fetch(`https://api.orcarouter.ai/v1/generation?id=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
  const record = await receipt.json();
  console.log(JSON.stringify({receiptStatus:receipt.status,totalCost:record.data?.total_cost,currency:record.data?.cost_currency,fields:Object.keys(record)}));
  if (process.env.RECOVER_CHAT === 'true' && receipt.ok && record.data?.total_cost === 0 && record.data?.cost_currency === 'USD') {
    const timestamp=Date.now();
    const signature=createHmac('sha256',key).update(`cost-recovery:${timestamp}:${id}`).digest('hex');
    const recovery=await fetch('https://work-history-chat.kim-h-g199510.workers.dev/admin/verify-cost',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,timestamp,signature}),signal:AbortSignal.timeout(15000)});
    if (!recovery.ok) throw new Error(`Cost recovery failed (${recovery.status}).`);
    console.log('Cost verification recovered after confirming settled USD 0; rate counters preserved.');
  }
} else console.log('No successful response or request ID for cost receipt.');
