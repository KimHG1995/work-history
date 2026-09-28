import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('required PR validate has no path filter, deployment or external service secrets', () => {
  const text = read('.github/workflows/docs-check.yml');
  assert.match(text, /pull_request:/);
  assert.match(text, /\n  validate:/);
  assert.doesNotMatch(text, /paths(?:-ignore)?:|pull_request_target|secrets\.|chat:deploy|deploy-pages|wrangler pages/);
  assert.match(text, /fetch-depth: 0/);
  assert.match(text, /persist-credentials: false/);
  assert.match(text, /scripts\/ci-changes\.mjs/);
  assert.match(text, /scripts\/run-ci\.mjs/);
});

test('site pipeline gates deployment and isolates concurrency from classification', () => {
  const text = read('.github/workflows/pages.yml');
  const githubJobs = text.split('\n  deploy_cloudflare:\n')[0];
  assert.doesNotMatch(githubJobs, /secrets\.|chat:deploy|ORCAROUTER/);
  assert.match(text, /steps\.changes\.outputs\.site == 'true'/);
  assert.match(text, /needs\.build\.outputs\.site == 'true'/);
  assert.match(text, /vars\.VITE_CHAT_API_URL/);
  assert.match(text, /\n  deploy:[\s\S]*\n    concurrency:/);
  assert.doesNotMatch(text, /^concurrency:/m);
  assert.match(text, /scripts\/check-deploy\.mjs/);
  assert.match(text, /steps\.freshness\.outputs\.deploy == 'true'/);
});

test('Worker deployment is manual and main-only with opt-in live AI verification', () => {
  const text = read('.github/workflows/chat-deploy.yml');
  assert.match(text, /workflow_dispatch:/);
  assert.doesNotMatch(text, /\n  (?:push|pull_request|schedule|workflow_run):/);
  assert.match(text, /inputs\.confirm/);
  assert.match(text, /refs\/heads\/main/);
  assert.match(text, /live_verify:[\s\S]*default: false/);
  assert.match(text, /CHAT_VERIFY_LIVE: \$\{\{ inputs\.live_verify \}\}/);
  assert.match(read('scripts/deploy-chat.mjs'), /process\.env\.CHAT_VERIFY_LIVE === 'true'/);
});

test('Vue chat uses the local version guard before a model request', () => {
  const text = read('site/.vitepress/theme/DocsChat.vue');
  assert.match(text, /await hashDocuments\(index\)/);
  assert.match(text, /await requestCurrentChat\(/);
  assert.doesNotMatch(text, /fetch\(`\$\{api\}\/chat`/);
});
