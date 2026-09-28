import test from 'node:test';
import assert from 'node:assert/strict';
import { needsSiteVariant } from '../scripts/verify-site-variants.mjs';

test('alternate build is limited to PR configuration changes, not every content edit', () => {
  for (const paths of [['docs/progress.md'], ['experience.md'], ['tests/chat-validation.test.mjs'], ['worker/policy.mjs']]) {
    assert.equal(needsSiteVariant({ build: true, paths, fallback: false }, 'pull_request'), false);
  }
  for (const file of ['scripts/site-config.mjs', 'scripts/prepare-public.mjs', 'scripts/prepare-site.mjs', 'scripts/prepare-chat.mjs', 'site/.vitepress/config.mjs', 'site/pages/privacy.md', 'scripts/verify-site-output.mjs', 'package.json']) {
    const impact = { build: true, paths: [file], fallback: false };
    assert.equal(needsSiteVariant(impact, 'pull_request'), true, file);
    assert.equal(needsSiteVariant(impact, 'push'), false);
  }
  assert.equal(needsSiteVariant({ build: true, paths: [], fallback: true }, 'merge_group'), true);
});

import { classifyChanges } from '../scripts/ci-changes.mjs';
test('public generators and crawler inputs do not fall back to unnecessary Worker tests', () => {
  for (const file of ['scripts/prepare-public.mjs', 'security/domain-root/robots.txt']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.site, true, file);
    assert.equal(impact.build, true, file);
    assert.equal(impact.workerTest, false, file);
  }
  for (const file of ['scripts/verify-site-output.mjs', 'scripts/verify-site-variants.mjs']) {
    const impact = classifyChanges([file]);
    assert.equal(impact.build, true, file);
    assert.equal(impact.site, false, file);
    assert.equal(impact.workerTest, false, file);
  }
  assert.equal(classifyChanges(['docs/progress.md']).site, false);
});
