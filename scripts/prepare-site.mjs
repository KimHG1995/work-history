import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'site/content');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const sources = ['experience.md', 'timeline.md'];
async function collect(dir) {
  for (const item of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const name = path.posix.join(dir, item.name);
    if (item.isDirectory()) await collect(name);
    else if (name.endsWith('.md')) sources.push(name);
  }
}
await collect('projects');
const route = source => source === 'experience.md' || source === 'README.md'
  ? 'index.md' : source.replace(/README\.md$/, 'index.md');
for (const source of sources) {
  const destination = route(source);
  let content = await readFile(path.join(root, source), 'utf8');
  // Repository navigation and authoring templates do not belong in the public reading view.
  content = content.split('\n').filter(line => !line.includes('templates/') &&
    !(source === 'experience.md' && line.includes('[전체 안내]'))).join('\n');
  content = content.replace(/\]\(([^)]+)\)/g, (match, href) => {
    if (/^(?:[a-z]+:|#)/i.test(href)) return match;
    const [file, fragment] = href.split('#');
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), file));
    if (!target.endsWith('.md')) return match;
    if (target !== 'README.md' && !sources.includes(target)) throw new Error(`Missing page: ${source} -> ${href}`);
    const relative = path.posix.relative(path.posix.dirname(destination), route(target));
    return `](${relative}${fragment ? `#${decodeURIComponent(fragment).normalize('NFKD')}` : ''})`;
  });
  const target = path.join(output, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
console.log(`Prepared ${sources.length} pages from existing Markdown.`);
