import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTwoColumnTable } from '../scripts/validate-markdown-table.mjs';

const keys = ['작업 기간', '맡은 범위', '개발 상태', '운영 상태'];
const valid = [
  '| 항목 | 내용 |',
  '| --- | --- |',
  '| 작업 기간 | 2025-02-25 합류 |',
  '| 맡은 범위 | 공통 서버 구현 |',
  '| 개발 상태 | 개발 완료 |',
  '| 운영 상태 | 운영 반영 |'
].join('\n');

test('accepts a single continuous two-column metadata table', () => {
  assert.equal(validateTwoColumnTable(valid, keys), null);
  assert.equal(validateTwoColumnTable(valid + '\n\n개발 배포일은 별도 표기합니다.', keys), null);
});

test('rejects a blank line that separates a metadata row', () => {
  assert.match(validateTwoColumnTable(valid.replace('\n| 맡은 범위', '\n\n| 맡은 범위'), keys), /빈 줄/u);
});

test('rejects missing separator, reordered and incomplete metadata rows', () => {
  assert.ok(validateTwoColumnTable(valid.replace('| --- | --- |', '| 내용 | 상세 |'), keys));
  assert.ok(validateTwoColumnTable(valid.replace('작업 기간 | 2025-02-25 합류', '맡은 범위 | 2025-02-25 합류'), keys));
  assert.ok(validateTwoColumnTable(valid.replace('운영 반영', ''), keys));
});
