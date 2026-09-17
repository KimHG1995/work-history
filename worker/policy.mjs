export function reserve(previous, ip, hash, now) {
  const state = structuredClone(previous);
  state.calls = (state.calls || []).filter(x => x.at > now - 60000);
  state.active = (state.active || []).filter(x => x.until > now);
  if ((state.cooldown || 0) > now) return {ok:false, reason:'provider', retryAfter:Math.ceil((state.cooldown-now)/1000)};
  if (state.calls.some(x=>x.ip===ip && x.hash===hash)) return {ok:false,reason:'duplicate',retryAfter:60};
  const mine=state.calls.filter(x=>x.ip===ip);
  const waits=[0];
  if(state.calls.length)waits.push(state.calls.at(-1).at+1000-now);
  if(state.calls.length>=8)waits.push(state.calls[0].at+60000-now);
  if(mine.length)waits.push(mine.at(-1).at+10000-now);
  if(mine.length>=3)waits.push(mine[0].at+60000-now);
  if(state.active.length>=2)waits.push(Math.min(...state.active.map(x=>x.until))-now);
  const wait=Math.max(...waits);
  if(wait>0)return {ok:false,reason:'rate',retryAfter:Math.ceil(wait/1000)};
  const id=crypto.randomUUID();
  state.calls.push({ip,hash,at:now});state.active.push({id,until:now+45000});
  return {ok:true,id,state};
}
export function finish(previous,id,now,cooldown=0){
  return {...previous,active:(previous.active||[]).filter(x=>x.id!==id&&x.until>now),cooldown:Math.max(previous.cooldown||0,cooldown)};
}
