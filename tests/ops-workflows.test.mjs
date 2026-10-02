import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('AI deployment never generates an answer; independent verification has no secrets or deployment steps', () => {
  const deploy = read('.github/workflows/chat-deploy.yml');
  assert.doesNotMatch(deploy, /live_verify:|CHAT_VERIFY_LIVE|verify-chat\.mjs/);
  assert.doesNotMatch(read('scripts/deploy-chat.mjs'), /\$\{api\}\/chat|CHAT_VERIFY_LIVE/);
  const verify = read('.github/workflows/chat-verify.yml');
  assert.match(verify, /workflow_dispatch:/);
  assert.match(verify, /github\.ref == 'refs\/heads\/main' && inputs\.confirm/);
  assert.match(verify, /CHAT_VERIFY_LIVE: \$\{\{ inputs\.live_verify \}\}/);
  assert.match(verify, /scripts\/verify-chat\.mjs/);
  assert.doesNotMatch(verify, /secrets[.\[]|CLOUDFLARE_API_TOKEN|ORCAROUTER_API_KEY|npm ci|chat:deploy|continue-on-error|workflow_run|\n  (?:push|pull_request|schedule):/);
});
test('Pages upload is followed by a separate credential-free public check only when actually deployed', () => {
  const text = read('.github/workflows/pages.yml');
  assert.match(text, /SITE_TARGET: pages/);
  assert.match(text, /id: token\n[\s\S]*scripts\/pages-token\.mjs/);
  assert.match(text, /secrets\[steps\.token\.outputs\.name\]/);
  assert.match(text, /if: steps\.upload\.outputs\.deployed == 'true'/);
  const check = text.split('name: 공개 페이지와 정적 파일 확인')[1];
  assert.match(check, /scripts\/verify-public-site\.mjs/);
  assert.doesNotMatch(check, /secrets|continue-on-error/);
  assert.match(read('scripts/deploy-site.mjs'), /GITHUB_OUTPUT, `deployed=\$\{result\.deployed\}/);
});
test('AI verification-only edits never cause a site deployment', async () => {
  const { classifyChanges } = await import('../scripts/ci-changes.mjs');
  for (const file of ['scripts/verify-chat.mjs','.github/workflows/chat-verify.yml']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, false, file); assert.equal(impact.build, false, file); assert.equal(impact.worker, false, file);
    assert.equal(impact.unit, true, file);
  }
});
