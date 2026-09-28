import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const keys = ['docsCheck', 'site', 'build', 'unit', 'worker', 'workerTest', 'mermaid'];
const blank = () => Object.fromEntries(keys.map(key => [key, false]));
const full = () => Object.fromEntries(keys.map(key => [key, true]));
const shaPattern = /^[a-f0-9]{40}$/i;
const internalFiles = new Set(['AGENTS.md', 'README.md', 'SECURITY.md', 'writing-guide.md', 'LICENSE', 'LICENSE.md', '.editorconfig', '.gitignore']);
const sharedWorkerFiles = new Set(['worker/search.mjs', 'worker/docs-version.mjs']);
const ciScripts = new Set(['scripts/ci-changes.mjs', 'scripts/run-ci.mjs', 'scripts/check-deploy.mjs']);

/** Classify build inputs, not commit messages or filename extensions alone. */
export function classifyChanges(paths) {
  if (!Array.isArray(paths)) return full();
  const result = blank();
  const set = (...flags) => flags.forEach(flag => { result[flag] = true; });
  for (const file of paths) {
    if (typeof file !== 'string' || !file || path.posix.isAbsolute(file) || file.split('/').includes('..')) return full();
    if (file.endsWith('.md')) set('docsCheck');
    if (internalFiles.has(file) || file.startsWith('docs/') || file.startsWith('templates/')) continue;
    if (['experience.md', 'timeline.md'].includes(file) || file.startsWith('projects/')) {
      set('docsCheck', 'site', 'build', 'unit', 'worker');
    } else if (file.startsWith('tests/')) {
      set('unit');
      if (file.endsWith('.integration.mjs')) set('workerTest');
    } else if (sharedWorkerFiles.has(file)) {
      set('site', 'build', 'unit', 'worker', 'workerTest');
    } else if (file.startsWith('worker/') || file === 'wrangler.jsonc' || ['scripts/deploy-chat.mjs', 'scripts/diagnose-chat.mjs'].includes(file)) {
      set('unit', 'worker', 'workerTest');
    } else if (file === 'scripts/prepare-chat.mjs' || file === 'scripts/prepare-site.mjs' || file === 'scripts/site-config.mjs') {
      set('docsCheck', 'site', 'build', 'unit', 'worker', 'workerTest');
    } else if (['scripts/deploy-site.mjs', 'scripts/pages-config.mjs', 'scripts/static-output.mjs', 'wrangler.pages.jsonc'].includes(file)) {
      set('site', 'build', 'unit');
    } else if (file === 'scripts/prepare-public.mjs') {
      set('docsCheck', 'site', 'build', 'unit');
    } else if (['scripts/verify-site-output.mjs', 'scripts/verify-site-variants.mjs'].includes(file)) {
      set('build', 'unit');
    } else if (file === 'scripts/validate-docs.mjs') {
      set('docsCheck', 'unit');
    } else if (file === 'scripts/validate-mermaid.mjs') {
      set('docsCheck', 'mermaid', 'unit');
    } else if (ciScripts.has(file)) {
      set('docsCheck', 'build', 'unit', 'workerTest', 'mermaid');
    } else if (file.startsWith('.github/')) {
      set('docsCheck', 'build', 'unit', 'workerTest', 'mermaid');
      if (file === '.github/workflows/pages.yml') set('site');
    } else if (file.startsWith('site/') || file === 'scripts/secure-site.mjs') {
      set('site', 'build', 'unit');
    } else if (file === 'security/domain-root/robots.txt') {
      set('docsCheck', 'site', 'build', 'unit');
    } else {
      // New inputs must not silently bypass checks or deployment.
      return full();
    }
  }
  return result;
}

export function changedPaths(cwd, base, head, threeDot = false) {
  if (![base, head].every(sha => shaPattern.test(sha || '') && !/^0+$/.test(sha))) throw new Error('Invalid diff revision');
  const output = execFileSync('git', ['diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', `${base}${threeDot ? '...' : '..'}${head}`, '--'], {
    cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  // --no-renames retains both deleted and added paths; -z preserves all filenames.
  return output.split('\0').filter(Boolean);
}

export function inspectChanges({ cwd = process.cwd(), eventName, event }) {
  if (eventName === 'workflow_dispatch') return { ...full(), paths: [], fallback: false };
  let paths;
  try {
    if (eventName === 'pull_request') {
      paths = changedPaths(cwd, event.pull_request.base.sha, event.pull_request.head.sha, true);
    } else if (eventName === 'push') {
      paths = changedPaths(cwd, event.before, event.after);
    } else if (eventName === 'merge_group') {
      paths = changedPaths(cwd, event.merge_group.base_sha, event.merge_group.head_sha);
    } else throw new Error('Unsupported event');
    const result = classifyChanges(paths);
    for (const file of paths.filter(file => file.endsWith('.md'))) {
      try {
        if (/^\s*(?:`{3,}|~{3,})mermaid\b/m.test(readFileSync(path.join(cwd, file), 'utf8'))) result.mermaid = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    return { ...result, paths, fallback: false };
  } catch {
    return { ...full(), paths: [], fallback: true };
  }
}

/** Permit docs-only newer commits, but never overtake newer production inputs. */
export function mayDeploy(pathsSinceBuild) {
  return Array.isArray(pathsSinceBuild) && !classifyChanges(pathsSinceBuild).site;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let event;
  try { event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')); } catch { event = null; }
  const result = inspectChanges({ eventName: process.env.GITHUB_EVENT_NAME, event });
  const destination = process.argv[2];
  if (!destination) throw new Error('Usage: node scripts/ci-changes.mjs <manifest.json>');
  writeFileSync(destination, JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, keys.map(key => `${key}=${result[key]}\n`).join(''));
  const summary = `## 변경 영향\n\n${keys.map(key => `- ${key}: ${result[key]}`).join('\n')}\n\n변경 파일 ${result.paths.length}개, 안전한 전체 검사 전환: ${result.fallback}\n${result.worker ? '\nAI 원본 변경: Worker 배포는 별도 수동 실행입니다.\n' : ''}`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(JSON.stringify(Object.fromEntries([...keys, 'fallback'].map(key => [key, result[key]]))));
}
