import test from 'node:test';
import assert from 'node:assert/strict';
import { hashDocuments } from '../worker/docs-version.mjs';
import { requestCurrentChat } from '../site/.vitepress/theme/chat-request.mjs';
const api = 'https://work-history-chat.example.workers.dev';
const docs = [{ title: '작업', url: '/work-history/task', text: '현재 공개 문서' }];

test('document digests change with content and URLs', async () => {
  const digest = await hashDocuments(docs);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, await hashDocuments(JSON.parse(JSON.stringify(docs))));
  assert.notEqual(digest, await hashDocuments([{ ...docs[0], text: '수정' }]));
  assert.notEqual(digest, await hashDocuments([{ ...docs[0], url: '/task' }]));
});

test('missing API and invalid settings produce no requests', async () => {
  const digest = await hashDocuments(docs);
  const calls = [];
  for (const [url, version] of [['', digest], ['https://evil.example', digest], [api, '']]) {
    assert.equal(await requestCurrentChat({ api: url, docsDigest: version, question: 'test', fetchImpl: async (...args) => calls.push(args) }), null);
  }
  assert.equal(calls.length, 0);
});

test('outdated and legacy Workers never receive a model request', async () => {
  const digest = await hashDocuments(docs);
  for (const health of [{ ready: true }, { ready: true, docsDigest: '0'.repeat(64) }, { ready: false, docsDigest: digest }]) {
    const calls = [];
    const result = await requestCurrentChat({ api, docsDigest: digest, question: 'test', fetchImpl: async url => { calls.push(url); return Response.json(health); } });
    assert.equal(result, null);
    assert.deepEqual(calls, [`${api}/health`]);
  }
});

test('health failures preserve local fallback', async () => {
  const digest = await hashDocuments(docs);
  for (const fetchImpl of [async () => new Response('', { status: 503 }), async () => new Response('not json'), async () => { throw new Error('offline'); }]) {
    assert.equal(await requestCurrentChat({ api, docsDigest: digest, question: 'test', fetchImpl }), null);
  }
});

test('matching version sends exactly one chat request with a version guard', async () => {
  const digest = await hashDocuments(docs);
  const calls = [];
  const answer = Response.json({ answer: 'result' });
  const result = await requestCurrentChat({ api, docsDigest: digest, question: '질문', fetchImpl: async (url, options) => {
    calls.push([url, options]);
    return calls.length === 1 ? Response.json({ ready: true, docsDigest: digest }) : answer;
  } });
  assert.equal(result, answer);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[1][1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[1][1].body), { question: '질문', docsDigest: digest });
});

test('cancelled question produces no network request', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  assert.equal(await requestCurrentChat({ api, docsDigest: await hashDocuments(docs), question: 'test', signal: controller.signal, fetchImpl: async () => { calls++; return Response.json({}); } }), null);
  assert.equal(calls, 0);
});
