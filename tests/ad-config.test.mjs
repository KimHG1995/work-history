import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleAdDocument, readSiteConfig, applyPageMetadata } from '../scripts/site-config.mjs';
const approved = {
  SITE_TARGET: 'pages', SITE_ORIGIN: 'https://work-history-4gn.pages.dev',
  ADS_MODE: 'enabled', ADS_CSP_MODE: 'static-ads', ADS_PUBLISHER_ID: 'ca-pub-9486681340475427',
  ADS_SLOT_ID: '4869544605', ADS_CMP_CONFIRMED: 'true'
};

test('Pages ads are enabled only for an approved origin and confirmed CMP', () => {
  const cfg = readSiteConfig(approved);
  assert.equal(cfg.adsMode, 'enabled');
  assert.equal(cfg.slotId, '4869544605');
  for (const patch of [
    { SITE_TARGET: 'github' }, { SITE_ORIGIN: 'https://preview.work-history-4gn.pages.dev' },
    { ADS_SLOT_ID: '111' }, { ADS_PUBLISHER_ID: 'ca-pub-1234567890123456' },
    { ADS_CMP_CONFIRMED: 'false' }, { ADS_CSP_MODE: 'strict' }
  ]) assert.throws(() => readSiteConfig({ ...approved, ...patch }));
});

test('content documents qualify while navigation and short pages do not', () => {
  const long = '# 기술 기록\n\n' + '상세한 시스템 설계와 구현의 문제 해결 과정. '.repeat(30);
  for (const url of ['projects/public-education/attendance.md', 'projects/loglens/README.md']) {
    assert.equal(eligibleAdDocument(url, long), true);
    const page = { relativePath: url, frontmatter: {} };
    applyPageMetadata(page, readSiteConfig(approved), long);
    assert.equal(page.frontmatter.workHistoryAd, true);
  }
  for (const url of ['index.md', 'experience.md', 'timeline.md', 'about.md', 'privacy.md', 'projects/README.md', '404.md']) {
    assert.equal(eligibleAdDocument(url, long), false);
  }
  assert.equal(eligibleAdDocument('projects/index.md', long), false);
  assert.equal(eligibleAdDocument('projects/demo.md', '# 짧은 소개'), false);
  assert.equal(eligibleAdDocument('projects/demo.md', long + '\nads: false'), false);
});

test('TCF consent listener blocks unknown/denied and allows affirmative consent only', async () => {
  const { permitsAdConsent, subscribeAdConsent } = await import('../site/.vitepress/theme/ad-consent.mjs');
  const accepted = {
    eventStatus: 'useractioncomplete', gdprApplies: true, listenerId: 11,
    purpose: { consents: { 1: true, 4: true } },
    vendor: { consents: { 755: true } }
  };
  assert.equal(permitsAdConsent(undefined, false), false);
  assert.equal(permitsAdConsent({ ...accepted, gdprApplies: false }, true), false);
  assert.equal(permitsAdConsent({ ...accepted, purpose: { consents: { 1: false, 4: true } } }, true), false);
  assert.equal(permitsAdConsent(accepted, true), true);
  let listener;
  const states = [];
  let removed = 0;
  const api = (event, version, callback, id) => {
    if (event === 'addEventListener') listener = callback;
    if (event === 'removeEventListener' && id === 11) removed++;
  };
  const stop = subscribeAdConsent(allowed => states.push(allowed), api);
  listener(undefined, false);
  listener({ ...accepted, vendor: { consents: { 755: false } } }, true);
  listener(accepted, true);
  listener({ ...accepted, purpose: { consents: { 1: false, 4: true } } }, true);
  listener(accepted, true);
  assert.deepEqual(states, [false, false, true, false, true]);
  stop();
  listener(accepted, true);
  assert.deepEqual(states, [false, false, true, false, true]);
  assert.equal(removed, 1);
});


test('missing or throwing CMP fails closed', async () => {
  const { subscribeAdConsent } = await import('../site/.vitepress/theme/ad-consent.mjs');
  const states = [];
  const stop = subscribeAdConsent(value => states.push(value), undefined);
  stop();
  assert.deepEqual(states, [false]);
  subscribeAdConsent(value => states.push(value), () => { throw Error('CMP unavailable'); });
  assert.deepEqual(states, [false, false]);
});

test('consent withdrawal while SDK is loading prevents push after SDK resolves', async () => {
  const { createAdRuntime } = await import('../site/.vitepress/theme/ad-runtime.mjs');
  const { subscribeAdConsent } = await import('../site/.vitepress/theme/ad-consent.mjs');
  const accepted = {
    gdprApplies: true, eventStatus: 'useractioncomplete', listenerId: 99,
    purpose: { consents: { 1: true, 4: true } }, vendor: { consents: { 755: true } }
  };
  let callback;
  const api = (event, version, handler) => { if (event === 'addEventListener') callback = handler; };
  let resolveSdk;
  const pending = new Promise(resolve => { resolveSdk = resolve; });
  let sdkLoads = 0;
  let pushes = 0;
  const runtime = createAdRuntime({
    loadSdk: () => { sdkLoads++; return pending; },
    initializeAd: () => { pushes++; },
    isEligible: () => true
  });
  const stop = subscribeAdConsent(runtime.setConsent, api);
  callback(accepted, true);
  assert.equal(sdkLoads, 1);
  callback({ ...accepted, vendor: { consents: { 755: false } } }, true);
  resolveSdk();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 0, 'revoked consent must block push after SDK completion');
  callback(accepted, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sdkLoads, 1, 'same document must not load SDK twice');
  assert.equal(pushes, 1, 'a new affirmative signal may initialize once');
  callback(accepted, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 1);
  stop();
  runtime.dispose();
});

test('withdrawal after SDK resolves but before rendering invalidates stale continuation', async () => {
  const { createAdRuntime } = await import('../site/.vitepress/theme/ad-runtime.mjs');
  let releaseRender;
  const renderGate = new Promise(resolve => { releaseRender = resolve; });
  let renders = 0;
  let pushes = 0;
  const runtime = createAdRuntime({
    loadSdk: () => Promise.resolve(),
    initializeAd: () => { pushes++; },
    isEligible: () => true,
    waitForRender: () => ++renders === 1 ? renderGate : Promise.resolve()
  });
  runtime.setConsent(true);
  await new Promise(resolve => setImmediate(resolve));
  runtime.setConsent(false);
  releaseRender();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 0);
  runtime.setConsent(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 1);
  runtime.setConsent(false);
  runtime.setConsent(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 1, 'initialized slots are never pushed twice');
  runtime.dispose();
});

test('withdraw/regrant during pending SDK and unmount both remain race-safe', async () => {
  const { createAdRuntime } = await import('../site/.vitepress/theme/ad-runtime.mjs');
  let releaseSdk;
  const sdk = new Promise(resolve => { releaseSdk = resolve; });
  let pushes = 0;
  const runtime = createAdRuntime({
    loadSdk: () => sdk,
    initializeAd: () => { pushes++; },
    isEligible: () => true
  });
  runtime.setConsent(true);
  runtime.setConsent(false);
  runtime.setConsent(true);
  releaseSdk();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 1, 'only the newest permission generation may push');
  runtime.dispose();

  let releasePending;
  const pending = new Promise(resolve => { releasePending = resolve; });
  const next = createAdRuntime({
    loadSdk: () => pending,
    initializeAd: () => { pushes++; },
    isEligible: () => true
  });
  next.setConsent(true);
  next.dispose();
  releasePending();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pushes, 1, 'unmounted document cannot initialize');
});
