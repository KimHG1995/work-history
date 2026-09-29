import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyChanges, mayDeploy } from '../scripts/ci-changes.mjs';
import { runChecks } from '../scripts/run-ci.mjs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const job = (text, name) => text.split(`\n  ${name}:\n`)[1]?.split(/\n  [a-z_]+:\n/)[0];

test('guides have zero build or upload; production target applies only to one final build', () => {
  const docs = []; runChecks(classifyChanges(['docs/progress.md']), (...args) => docs.push(args), { SITE_TARGET: 'pages' });
  assert.deepEqual(docs, [[['node', 'scripts/validate-docs.mjs'], undefined]]);
  const calls = []; const settings = { SITE_TARGET: 'pages' };
  runChecks(classifyChanges(['projects/demo/task.md']), (...args) => calls.push(args), settings);
  assert.equal(calls.filter(([command]) => command.join(' ') === 'npm run docs:build').length, 1);
  for (const [command, env] of calls) assert.equal(env, command.join(' ') === 'npm run docs:build' ? settings : undefined);
  for (const file of ['scripts/deploy-site.mjs', 'scripts/static-output.mjs', 'scripts/pages-config.mjs', 'scripts/pages-token.mjs', 'wrangler.pages.jsonc']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, true); assert.equal(impact.workerTest, false); assert.equal(mayDeploy([file]), false);
  }
});

test('workflow defaults to Pages and retains exactly one target with manual GitHub recovery', () => {
  const text = read('.github/workflows/pages.yml');
  assert.doesNotMatch(text, /\n  (?:pull_request|pull_request_target|schedule|workflow_run):/);
  assert.match(job(text, 'build'), /scripts\/pages-config\.mjs/);
  assert.match(job(text, 'build'), /SITE_TARGET: pages/);
  assert.match(job(text, 'deploy'), /needs\.build\.outputs\.target == 'github'/);
  assert.match(job(text, 'deploy_cloudflare'), /needs\.build\.outputs\.target == 'pages'/);
  for (const name of ['deploy', 'deploy_cloudflare']) {
    assert.match(job(text, name), /needs\.build\.outputs\.site == 'true'/);
    assert.match(job(text, name), /group: pages\n      cancel-in-progress: false/);
  }
  assert.match(text, /confirm_pages:[\s\S]*default: false/);
});

test('Cloudflare credentials exist only on the Pages upload step, never the build, public check or GitHub job', () => {
  const text = read('.github/workflows/pages.yml');
  assert.doesNotMatch(job(text, 'build') + job(text, 'deploy'), /secrets[.\[]/);
  assert.equal((text.match(/secrets[.\[]/g) || []).length, 1);
  const cloud = job(text, 'deploy_cloudflare');
  assert.match(cloud, /npm ci --ignore-scripts/);
  assert.match(cloud, /scripts\/deploy-site\.mjs --upload/);
  assert.match(cloud, /CLOUDFLARE_PAGES_API_TOKEN: \$\{\{ secrets\[steps\.token\.outputs\.name\] \}\}/);
  assert.doesNotMatch(cloud, /chat:deploy|ORCAROUTER|docs:build|docs:prepare|pages: write|id-token: write/);
  assert.match(job(text, 'build'), /scripts\/deploy-site\.mjs --check/);
});

test('Pages deployment changes validate a real alternate artifact only on PRs', async () => {
  const { needsSiteVariant } = await import('../scripts/verify-site-variants.mjs');
  for (const file of ['scripts/deploy-site.mjs', 'scripts/pages-config.mjs', 'scripts/static-output.mjs', 'wrangler.pages.jsonc', '.github/workflows/pages.yml', 'scripts/run-ci.mjs']) {
    const impact = { build: true, paths: [file], fallback: false };
    assert.equal(needsSiteVariant(impact, 'pull_request'), true, file);
    assert.equal(needsSiteVariant(impact, 'push'), false, file);
  }
});
