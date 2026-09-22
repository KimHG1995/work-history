import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mermaid from 'mermaid';

const root = path.resolve(import.meta.dirname, '..');
const skipped = new Set(['.git', 'node_modules']);
const skippedPaths = ['site/content', 'site/.vitepress/cache', 'site/.vitepress/dist'];

async function collect(dir = root) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full).split(path.sep).join('/');
    if (skippedPaths.some(item => relative === item || relative.startsWith(`${item}/`))) continue;
    if (entry.isDirectory()) files.push(...await collect(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function extractMermaid(file, source) {
  const lines = source.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].trim() !== '```mermaid') continue;
    const startLine = index + 1;
    const body = [];
    index++;
    while (index < lines.length && lines[index].trim() !== '```') {
      body.push(lines[index]);
      index++;
    }
    if (index >= lines.length) throw new Error(`${file}:${startLine} Mermaid 코드 블록이 닫히지 않았습니다.`);
    blocks.push({ startLine, source: body.join('\n') });
  }
  return blocks;
}

mermaid.initialize({ startOnLoad: false });
const files = await collect();
let count = 0;
const failures = [];

for (const full of files) {
  const relative = path.relative(root, full).split(path.sep).join('/');
  const source = await readFile(full, 'utf8');
  let blocks;
  try {
    blocks = extractMermaid(relative, source);
  } catch (error) {
    failures.push(error.message);
    continue;
  }
  for (const block of blocks) {
    count++;
    try {
      await mermaid.parse(block.source);
    } catch (error) {
      failures.push(`${relative}:${block.startLine} ${error?.message || error}`);
    }
  }
}

if (failures.length) {
  console.error(`Mermaid 문법 오류 ${failures.length}건`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Mermaid 문법 검증 완료: ${count}개 블록`);
