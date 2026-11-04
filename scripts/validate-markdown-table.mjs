/** The metadata table must be one uninterrupted Markdown block. */
export function validateTwoColumnTable(section, expectedKeys) {
  const blocks = section.trim().split(/\n\s*\n/u);
  const lines = (blocks[0] ?? '').split('\n').map(line => line.trim());
  const parse = line => /^\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|$/u.exec(line ?? '');
  if (lines.length !== expectedKeys.length + 2) return '표 헤더와 모든 데이터 행을 빈 줄 없이 연결해야 합니다.';
  const header = parse(lines[0]);
  if (!header || header[1] !== '항목' || header[2] !== '내용') return '항목 / 내용 두 열 헤더가 필요합니다.';
  const separator = parse(lines[1]);
  if (!separator || !/^:?-{3,}:?$/u.test(separator[1]) || !/^:?-{3,}:?$/u.test(separator[2])) return '두 열의 Markdown 구분선이 필요합니다.';
  for (const [index, key] of expectedKeys.entries()) {
    const row = parse(lines[index + 2]);
    if (!row || row[1] !== key || !row[2]) return `행 ${index + 1}의 항목 또는 내용이 잘못됐습니다: ${key}`;
  }
  if (blocks.slice(1).some(block => /^\|/mu.test(block.trim()))) return '표 중간에 빈 줄이 있거나 분리된 행이 있습니다.';
  return null;
}
