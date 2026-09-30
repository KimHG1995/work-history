import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public contact paths expose email and GitHub without a phone number', () => {
  const about = read('site/pages/about.md');
  const privacy = read('site/pages/privacy.md');
  for (const text of [about, privacy]) {
    assert.match(text, /mailto:kim\.h\.g199510@gmail\.com/);
    assert.match(text, /github\.com\/KimHG1995\/work-history\/issues/);
  }
  assert.doesNotMatch(about, /(?:01[016789])[- ]?\d{3,4}[- ]?\d{4}/);
});

test('about page describes the actual retrieval-assisted LLM question flow', () => {
  const about = read('site/pages/about.md');
  assert.match(about, /## AI 질문 기능/);
  assert.match(about, /```mermaid[\s\S]*사용자 질문[\s\S]*공개 문서 인덱스[\s\S]*키워드[\s\S]*관련 문서[\s\S]*LLM[\s\S]*답변/);
  assert.match(about, /임베딩.*벡터 DB.*사용하지/u);
  assert.match(about, /공개 문서 검색 결과.*컨텍스트.*LLM/u);
});
