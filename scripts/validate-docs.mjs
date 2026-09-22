import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const projectsRoot = path.join(root, 'projects');
const failures = [];

const toPosix = value => value.split(path.sep).join('/');
const relative = file => toPosix(path.relative(root, file));

async function markdownFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'site') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function tableRows(block) {
  return [...block.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/gm)]
    .map(match => [match[1].trim(), match[2].trim()])
    .filter(([key]) => key !== '항목' && !/^---+$/.test(key));
}

function section(content, heading) {
  const marker = '## ' + heading;
  const start = content.indexOf(marker);
  if (start < 0) return '';
  const bodyStart = content.indexOf('\n\n', start);
  if (bodyStart < 0) return '';
  const next = content.indexOf('\n## ', bodyStart + 2);
  return content.slice(bodyStart + 2, next < 0 ? content.length : next);
}

function taskList(content) {
  const block = section(content, '작업 목록');
  return [...block.matchAll(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|$/gm)]
    .map(match => ({ name: match[1], href: match[2], summary: match[3].trim() }));
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

const allMarkdown = await markdownFiles(root);

for (const file of allMarkdown) {
  const content = await readFile(file, 'utf8');
  if (content.includes('·')) failures.push(relative(file) + ': 가운뎃점을 사용했습니다.');

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].trim();
    if (!href || /^(?:[a-z]+:|#)/i.test(href)) continue;
    const targetPath = href.split('#')[0];
    if (!targetPath) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(targetPath));
    if (!await exists(target)) failures.push(relative(file) + ': 존재하지 않는 상대 링크 ' + href);
  }
}

const projectEntries = (await readdir(projectsRoot, { withFileTypes: true })).filter(entry => entry.isDirectory());
const overview = await readFile(path.join(projectsRoot, 'README.md'), 'utf8');
const overviewTasks = [...overview.matchAll(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|$/gm)]
  .map(match => ({ name: match[1], href: match[2], summary: match[3].trim() }));
const overviewByPath = new Map(overviewTasks.map(item => [path.posix.normalize(item.href), item]));

for (const entry of projectEntries) {
  const dir = path.join(projectsRoot, entry.name);
  const readmePath = path.join(dir, 'README.md');
  if (!await exists(readmePath)) { failures.push('projects/' + entry.name + ': README.md가 없습니다.'); continue; }

  const readme = await readFile(readmePath, 'utf8');
  const expectedProjectRows = ['프로젝트 구분', '회사 설명', '참여 기간', '맡은 범위'];
  const actualProjectRows = tableRows(section(readme, '기본 정보')).map(([key]) => key).slice(0, 4);
  if (JSON.stringify(actualProjectRows) !== JSON.stringify(expectedProjectRows)) {
    failures.push(relative(readmePath) + ': 기본 정보 순서는 ' + expectedProjectRows.join(', ') + ' 이어야 합니다.');
  }
  if (!readme.includes('## 작업 목록')) failures.push(relative(readmePath) + ': 작업 목록이 없습니다.');

  for (const item of taskList(readme)) {
    const overviewPath = path.posix.join(entry.name, item.href);
    const master = overviewByPath.get(overviewPath);
    if (!master) failures.push(relative(readmePath) + ': 전체 작업 목록에 ' + item.name + '이 없습니다.');
    else if (master.summary !== item.summary) failures.push(relative(readmePath) + ': ' + item.name + ' 요약이 전체 작업 목록과 다릅니다.');
  }

  const children = (await readdir(dir, { withFileTypes: true })).filter(child => child.isFile() && child.name.endsWith('.md') && child.name !== 'README.md');
  for (const child of children) {
    const taskPath = path.join(dir, child.name);
    const content = await readFile(taskPath, 'utf8');
    const required = ['기본 정보', '왜 시작했는지', '기술 스택', '어떻게 해결했는지', '결과와 현재 상태'];
    for (const heading of required) if (!content.includes('## ' + heading)) failures.push(relative(taskPath) + ': ' + heading + ' 섹션이 없습니다.');

    const expectedTaskRows = ['작업 기간', '맡은 범위', '개발 상태', '운영 상태'];
    const actualTaskRows = tableRows(section(content, '기본 정보')).map(([key]) => key).slice(0, 4);
    if (JSON.stringify(actualTaskRows) !== JSON.stringify(expectedTaskRows)) {
      failures.push(relative(taskPath) + ': 기본 정보 순서는 ' + expectedTaskRows.join(', ') + ' 이어야 합니다.');
    }
    if (!/```mermaid[\s\S]*?```/.test(content)) failures.push(relative(taskPath) + ': Mermaid 처리 흐름이 없습니다.');
  }
}

if (failures.length) {
  console.error('문서 구조 검증 실패 ' + failures.length + '건');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('문서 구조 검증 완료: ' + projectEntries.length + '개 프로젝트, ' + allMarkdown.length + '개 Markdown');
