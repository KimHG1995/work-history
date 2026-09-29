import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { classifyChanges } from '../scripts/ci-changes.mjs';
const file = new URL('../.github/workflows/pages-bootstrap.yml', import.meta.url);
function workflow() { assert.ok(existsSync(file), 'manual Pages bootstrap workflow missing'); return readFileSync(file,'utf8'); }

test('setup is manual main-only, explicitly confirmed and accepts only the named token choices', () => {
  const text=workflow();
  assert.match(text,/workflow_dispatch:/);
  assert.doesNotMatch(text,/\n  (?:push|pull_request|pull_request_target|issues|issue_comment|schedule|workflow_run|repository_dispatch):/);
  assert.match(text,/github\.ref == 'refs\/heads\/main' && inputs\.confirm/);
  assert.match(text,/contains\(fromJSON\('\["CLOUDFLARE_PAGES_API_TOKEN","CLOUDFLARE_API_TOKEN"\]'\), inputs\.token_secret\)/);
  assert.match(text,/confirm:[\s\S]*?default: false/);
  assert.doesNotMatch(text,/contents: write|pull-requests: write|actions: write|ORCAROUTER/);
  assert.match(text,/group: pages\n  cancel-in-progress: false/);
});

test('setup builds once without secrets, preserves the project result before upload and does not enable ads', () => {
  const text=workflow();
  assert.equal((text.match(/run: npm run docs:build/g)||[]).length,1);
  assert.equal((text.match(/secrets\[inputs\.token_secret\]/g)||[]).length,2);
  const build=text.split('name: 광고 없는 정적 빌드')[1].split('      - name:')[0];
  assert.match(build,/SITE_ORIGIN: \$\{\{ steps\.project\.outputs\.origin \}\}/);
  assert.match(build,/ADS_MODE: 'off'/); assert.doesNotMatch(build,/secrets\[/);
  assert.ok(text.indexOf('uses: actions/upload-artifact@v4') < text.indexOf('name: 광고 없는 정적 빌드'));
  assert.match(text,/scripts\/deploy-site\.mjs --upload/);
  assert.doesNotMatch(text,/gh variable|github\.com\/.*\/actions\/variables|chat:deploy|wrangler deploy/);
});

test('setup-only edits do not rebuild or deploy a site; saved identity remains a site input', () => {
  for (const path of ['scripts/bootstrap-pages.mjs','.github/workflows/pages-bootstrap.yml','docs/pages-bootstrap.md']) {
    const flags=classifyChanges([path]); assert.equal(flags.site,false,path); assert.equal(flags.build,false,path); assert.equal(flags.worker,false,path);
  }
  for (const path of ['scripts/pages-project.mjs','site/pages.project.json']) {
    const flags=classifyChanges([path]); assert.equal(flags.site,true,path); assert.equal(flags.build,true,path); assert.equal(flags.workerTest,false,path);
  }
});
