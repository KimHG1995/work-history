import test from 'node:test';
import assert from 'node:assert/strict';
import { makePayload, validateQuestion } from '../worker/chat.mjs';
const docsDigest = '0123456789abcdef'.repeat(4);

test('question validator accepts an optional SHA-256 document version', () => {
  assert.equal(validateQuestion({ question: '  쿠폰 시스템  ', docsDigest }), '쿠폰 시스템');
  assert.equal(validateQuestion({ question: '  쿠폰 시스템  ' }), '쿠폰 시스템');
});

test('document version has an exact lowercase hexadecimal format when present', () => {
  for (const value of [undefined, null, false, 0, {}, [], [docsDigest], '', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), docsDigest.toUpperCase(), `${docsDigest}\n`]) {
    assert.throws(() => validateQuestion({ question: '질문', docsDigest: value }), /invalid/);
  }
});

test('optional version never allows unknown request fields or paid model overrides', () => {
  for (const extra of [{ model: 'paid-model' }, { max_tokens: 9999 }, { documents: [] }, { docsVersion: docsDigest }, { unexpected: true }]) {
    assert.throws(() => validateQuestion({ question: '질문', docsDigest, ...extra }), /invalid/);
    assert.throws(() => validateQuestion({ question: '질문', ...extra }), /invalid/);
  }
});

test('versioned questions retain the existing body and Unicode length validation', () => {
  for (const body of [null, [], '질문', { docsDigest }, { question: 123, docsDigest }, { question: '  ', docsDigest }, { question: '가'.repeat(501), docsDigest }]) {
    assert.throws(() => validateQuestion(body), /invalid/);
  }
  assert.equal(validateQuestion({ question: '😀'.repeat(500), docsDigest }), '😀'.repeat(500));
});

test('document version stays local and is not forwarded to the model payload', () => {
  const question = validateQuestion({ question: '질문', docsDigest });
  const payload = makePayload(question, []);
  assert.equal(payload.model, 'orcarouter/free');
  assert.equal(payload.max_tokens, 512);
  assert.deepEqual(JSON.parse(payload.messages[1].content), { question, documents: [] });
  assert.equal(JSON.stringify(payload).includes(docsDigest), false);
});
