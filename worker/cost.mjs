export function isZeroCost(value) {
  return (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) === 0;
}
export async function verifyReceipt(id, key, request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (typeof id !== 'string' || !id || id.length > 200) return false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await pause(attempt * 1000);
    const response = await request(`https://api.orcarouter.ai/v1/generation?id=${encodeURIComponent(id)}`, {headers:{Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(5000)});
    if (response.status === 404) continue; // Settlement may finish after the answer.
    if (!response.ok) return false;
    const body = await response.json();
    return body.data?.cost_currency === 'USD' && isZeroCost(body.data?.total_cost);
  }
  return false;
}
