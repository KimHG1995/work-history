import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classifyChanges, inspectChanges, mayDeploy } from '../scripts/ci-changes.mjs';
import { checkCommands, runChecks } from '../scripts/run-ci.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function fixture(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'work-history-ci-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  git(cwd, 'init', '-q', '-b', 'main');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'user.email', 'test@example.invalid');
  const put = (file, content = 'test\n') => { mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true }); writeFileSync(path.join(cwd, file), content); };
  const commit = () => { git(cwd, 'add', '-A'); git(cwd, 'commit', '-qm', 'test'); return git(cwd, 'rev-parse', 'HEAD'); };
  return { cwd, put, commit };
}

test('internal guides require documentation checks only', () => {
  const impact = classifyChanges(['AGENTS.md', 'README.md', 'writing-guide.md', 'docs/plan.md', 'templates/task.md']);
  assert.equal(impact.docsCheck, true);
  for (const key of ['site', 'build', 'unit', 'worker', 'workerTest']) assert.equal(impact[key], false, key);
  assert.deepEqual(checkCommands(impact), [['node', 'scripts/validate-docs.mjs']]);
});

test('published Markdown builds the site and marks AI input changed', () => {
  for (const file of ['experience.md', 'timeline.md', 'projects/demo/task.md', 'projects/demo/README.md']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, true, file);
    assert.equal(impact.worker, true, file);
    assert.equal(impact.unit, true, file);
    assert.equal(impact.workerTest, false);
    assert.equal(checkCommands(impact).filter(x => x.includes('docs:build')).length, 1);
  }
});

test('worker-only code does not build the site; browser-shared code does', () => {
  for (const file of ['worker/index.mjs', 'worker/policy.mjs', 'worker/chat.mjs', 'worker/cost.mjs', 'wrangler.jsonc']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, false, file);
    assert.equal(impact.build, false, file);
    assert.equal(impact.workerTest, true, file);
  }
  assert.equal(classifyChanges(['worker/search.mjs']).site, true);
  assert.equal(classifyChanges(['worker/docs-version.mjs']).site, true);
});

test('test-only changes never deploy or build the site', () => {
  for (const file of ['tests/site-ci.test.mjs', 'tests/chat.test.mjs', 'tests/new.test.mjs', 'tests/worker.integration.mjs']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, false);
    assert.equal(impact.build, false);
    assert.equal(impact.unit, true);
    assert.equal(impact.worker, false);
    assert.equal(impact.workerTest, file.endsWith('.integration.mjs'));
  }
});

test('dependencies and unknown inputs use full verification', () => {
  for (const file of ['package.json', 'package-lock.json', 'new-build-setting.json', '../unsafe']) {
    assert.equal(classifyChanges([file]).site, true);
    assert.equal(classifyChanges([file]).workerTest, true);
  }
  assert.equal(classifyChanges(['site/.vitepress/config.mjs']).site, true);
  assert.equal(classifyChanges(['scripts/secure-site.mjs']).site, true);
  assert.equal(classifyChanges(['scripts/ci-changes.mjs']).site, false);
  assert.equal(classifyChanges(['scripts/ci-changes.mjs']).build, true);
});

test('PR uses merge-base without unrelated base-branch changes', t => {
  const { cwd, put, commit } = fixture(t);
  put('README.md'); commit();
  git(cwd, 'checkout', '-qb', 'topic'); put('docs/guide.md'); const head = commit();
  git(cwd, 'checkout', 'main'); put('site/new.css'); const base = commit();
  const result = inspectChanges({ cwd, eventName: 'pull_request', event: { pull_request: { base: { sha: base }, head: { sha: head } } } });
  assert.deepEqual(result.paths, ['docs/guide.md']);
  assert.equal(result.site, false);
  assert.equal(result.fallback, false);
});

test('push spans all commits and includes both rename paths and deletions', t => {
  const { cwd, put, commit } = fixture(t);
  put('site/old.css'); put('worker/cost.mjs'); const before = commit();
  put('docs/guide.md'); commit();
  renameSync(path.join(cwd, 'site/old.css'), path.join(cwd, 'docs/moved.css'));
  rmSync(path.join(cwd, 'worker/cost.mjs')); const after = commit();
  const result = inspectChanges({ cwd, eventName: 'push', event: { before, after } });
  for (const file of ['site/old.css', 'docs/moved.css', 'worker/cost.mjs', 'docs/guide.md']) assert.ok(result.paths.includes(file));
  assert.equal(result.site, true);
  assert.equal(result.workerTest, true);
});

test('diff includes over 300 files with Korean and spaced names', t => {
  const { cwd, put, commit } = fixture(t);
  put('README.md'); const before = commit();
  for (let i = 0; i < 350; i++) put(`docs/${i}.md`);
  put('site/마지막 파일.css'); const after = commit();
  const result = inspectChanges({ cwd, eventName: 'push', event: { before, after } });
  assert.equal(result.paths.length, 351);
  assert.ok(result.paths.includes('site/마지막 파일.css'));
  assert.equal(result.site, true);
});

test('invalid or unreadable revision causes full verification', t => {
  const { cwd } = fixture(t);
  for (const before of ['', '0'.repeat(40), 'a'.repeat(40), '--help']) {
    const result = inspectChanges({ cwd, eventName: 'push', event: { before, after: 'b'.repeat(40) } });
    assert.equal(result.fallback, true);
    assert.equal(result.site, true);
    assert.equal(result.workerTest, true);
  }
});

test('manual and merge queue events have explicit behavior', t => {
  const { cwd, put, commit } = fixture(t);
  put('README.md'); const base = commit(); put('docs/guide.md'); const head = commit();
  assert.equal(inspectChanges({ cwd, eventName: 'merge_group', event: { merge_group: { base_sha: base, head_sha: head } } }).site, false);
  const manual = inspectChanges({ cwd, eventName: 'workflow_dispatch', event: {} });
  assert.equal(manual.site, true);
  assert.equal(manual.fallback, false);
});

test('changed Mermaid is checked without site or Worker build', t => {
  const { cwd, put, commit } = fixture(t);
  put('README.md'); const before = commit();
  put('docs/diagram.md', '# Example\n\n```mermaid\nflowchart TD\n A --> B\n```\n'); const after = commit();
  const result = inspectChanges({ cwd, eventName: 'push', event: { before, after } });
  assert.equal(result.mermaid, true);
  const commands = checkCommands(result);
  assert.ok(commands.some(x => x.join(' ') === 'npm ci'));
  assert.ok(commands.some(x => x.includes('test:mermaid')));
  assert.ok(!commands.some(x => x.includes('docs:build') || x.includes('test:worker') || x.join(' ') === 'npm test'));
});

test('checks stop on failure and never execute cloud deployment', () => {
  const impact = classifyChanges(['package-lock.json']);
  assert.ok(checkCommands(impact).every(x => !/deploy|diagnose/.test(x.join(' '))));
  const ran = [];
  assert.throws(() => runChecks(impact, command => { ran.push(command); if (command.includes('ci')) throw new Error('install failed'); }), /install failed/);
  assert.ok(!ran.some(x => x.includes('docs:build')));
});

test('newer docs-only changes do not discard a valid site deployment', () => {
  assert.equal(mayDeploy(['docs/guide.md', 'AGENTS.md']), true);
  assert.equal(mayDeploy([]), true);
  for (const paths of [['site/new.css'], ['projects/demo/task.md'], ['.github/workflows/pages.yml'], null]) assert.equal(mayDeploy(paths), false);
});

test('deployment CLI checks latest main inside the queue and fails closed', t => {
  const { cwd, put, commit } = fixture(t);
  put('site/style.css'); const built = commit();
  git(cwd, 'remote', 'add', 'origin', cwd);
  const output = path.join(cwd, 'deploy-output');
  const script = new URL('../scripts/check-deploy.mjs', import.meta.url).pathname;
  const run = () => {
    writeFileSync(output, '');
    execFileSync(process.execPath, [script], { cwd, env: { ...process.env, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: built, GITHUB_OUTPUT: output }, stdio: 'pipe' });
    return readFileSync(output, 'utf8');
  };
  put('docs/guide.md'); commit();
  assert.equal(run(), 'deploy=true\n');
  put('site/style.css', 'changed'); commit();
  assert.equal(run(), 'deploy=false\n');
  git(cwd, 'remote', 'set-url', 'origin', path.join(cwd, 'missing-remote'));
  assert.throws(run);
  assert.equal(readFileSync(output, 'utf8'), '');
});
