const apiPattern = /^https:\/\/work-history-chat\.[a-z0-9-]+\.workers\.dev$/;

/** Called only for a submitted question, never on page load or a polling timer. */
export async function requestCurrentChat({ api, docsDigest, question, signal, fetchImpl = fetch }) {
  if (!apiPattern.test(api || '') || !/^[a-f0-9]{64}$/.test(docsDigest || '') || signal?.aborted) return null;
  const healthController = new AbortController();
  const abort = () => healthController.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 5000);
  try {
    const response = await fetchImpl(`${api}/health`, { cache: 'no-store', signal: healthController.signal });
    if (!response.ok) return null;
    const health = await response.json();
    if (health?.ready !== true || health.docsDigest !== docsDigest || signal?.aborted) return null;
  } catch { return null; }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  return fetchImpl(`${api}/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, docsDigest }), signal
  });
}
