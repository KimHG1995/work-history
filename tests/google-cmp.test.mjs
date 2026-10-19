import test from 'node:test';
import assert from 'node:assert/strict';
import * as consent from '../site/.vitepress/theme/ad-consent.mjs';

test('late Google CMP readiness attaches a single live TCF listener', () => {
  const win = {};
  const states = [];
  assert.equal(typeof consent.subscribeGoogleAdConsent, 'function');
  const stop = consent.subscribeGoogleAdConsent((allowed, data) => states.push([allowed, data?.gdprApplies]), win);
  let callback;
  let subscriptions = 0;
  let removals = 0;
  win.__tcfapi = (command, version, handler, id) => {
    assert.equal(version, 2);
    if (command === 'addEventListener') { subscriptions++; callback = handler; }
    if (command === 'removeEventListener') { assert.equal(id, 7); removals++; }
  };
  const ready = win.googlefc.callbackQueue[0].CONSENT_API_READY;
  ready(); ready();
  // Google's real non-European response has no eventStatus or tcString.
  callback({ cmpStatus: 'loaded', gdprApplies: false, listenerId: 7 }, true);
  assert.deepEqual(states, [[false, undefined], [false, false]], 'early false is not a region decision');
  win.googlefc.callbackQueue[1].CONSENT_DATA_READY();
  callback({ cmpStatus: 'error', gdprApplies: false, listenerId: 7 }, false);
  assert.deepEqual(states, [[false, undefined], [false, false], [true, false], [false, false]]);
  assert.equal(subscriptions, 1);
  stop();
  callback({ cmpStatus: 'loaded', eventStatus: 'tcloaded', gdprApplies: false }, true);
  assert.equal(states.length, 4);
  assert.equal(removals, 1);
});

test('unmount before Google CMP is ready cannot attach a listener', () => {
  const win = {};
  const states = [];
  assert.equal(typeof consent.subscribeGoogleAdConsent, 'function');
  const stop = consent.subscribeGoogleAdConsent(value => states.push(value), win);
  stop();
  win.__tcfapi = () => assert.fail('disposed subscriber must not attach');
  for (const entry of win.googlefc.callbackQueue) entry.CONSENT_API_READY?.();
  assert.deepEqual(states, [false]);
});

test('European preview cannot advertise on the transient non-European callback', () => {
  assert.equal(typeof consent.subscribeGoogleAdConsent, 'function');
  let callback;
  const win = { __tcfapi(command, version, handler) { if (command === 'addEventListener') callback = handler; } };
  const states = [];
  consent.subscribeGoogleAdConsent(value => states.push(value), win);
  callback({ cmpStatus: 'loaded', gdprApplies: false, listenerId: 0 }, true);
  callback({ cmpStatus: 'loaded', gdprApplies: true, eventStatus: 'cmpuishown', listenerId: 0 }, true);
  win.googlefc.callbackQueue[1].CONSENT_DATA_READY();
  assert.ok(states.every(value => value === false));
});

test('Google CMP script is independent from the ad SDK and exact-origin gated', async () => {
  const { loadGoogleCmp, loadAdSdk } = await import('../site/.vitepress/theme/ad-scripts.mjs');
  const scripts = [];
  const frames = [];
  const doc = { createElement: () => ({ style: {} }), head: { appendChild: script => scripts.push(script) }, body: { appendChild: frame => frames.push(frame) } };
  const win = { frames: {}, location: { origin: 'https://preview.work-history-4gn.pages.dev' } };
  const options = { window: win, document: doc, origin: 'https://work-history-4gn.pages.dev', publisher: 'ca-pub-9486681340475427' };
  await assert.rejects(loadGoogleCmp(options), /origin/i);
  await assert.rejects(loadAdSdk(options), /origin/i);
  assert.equal(scripts.length, 0);
  assert.equal(frames.length, 0);
  win.location.origin = options.origin;
  const cmp = loadGoogleCmp(options);
  const sameCmp = loadGoogleCmp(options);
  assert.equal(scripts.length, 1);
  assert.equal(frames.length, 1, 'independent CMP signals its presence before the SDK can start another instance');
  assert.equal(frames[0].name, 'googlefcPresent');
  assert.equal(scripts[0].src, 'https://fundingchoicesmessages.google.com/i/pub-9486681340475427?ers=1');
  assert.equal(scripts[0].crossOrigin, undefined, 'Google message tag does not support anonymous CORS');
  assert.equal(win.adsbygoogle, undefined, 'CMP bootstrap does not initialize ads');
  scripts[0].onload();
  await Promise.all([cmp, sameCmp]);
  const sdk = loadAdSdk(options);
  assert.equal(scripts.length, 2);
  assert.equal(win.adsbygoogle.pauseAdRequests, 1, 'pause is installed before SDK insertion');
  assert.equal(win.adsbygoogle.requestNonPersonalizedAds, 1);
  assert.equal(scripts[1].crossOrigin, 'anonymous');
  assert.match(scripts[1].src, /adsbygoogle\.js\?client=ca-pub-9486681340475427$/);
  scripts[1].onload();
  await sdk;
  await loadAdSdk(options);
  assert.equal(scripts.length, 2, 'SDK is shared for this document');
});

test('failed Google script stays failed without a request loop', async () => {
  const { loadGoogleCmp } = await import('../site/.vitepress/theme/ad-scripts.mjs');
  const scripts = [];
  const options = { window: { frames: {}, location: { origin: 'https://work-history-4gn.pages.dev' } },
    document: { createElement: () => ({ style: {} }), head: { appendChild: script => scripts.push(script) }, body: { appendChild() {} } },
    origin: 'https://work-history-4gn.pages.dev', publisher: 'ca-pub-9486681340475427' };
  const result = loadGoogleCmp(options);
  scripts[0].onerror();
  await assert.rejects(result, /Google script/);
  await assert.rejects(loadGoogleCmp(options), /Google script/);
  assert.equal(scripts.length, 1);
});

test('official European preview parameters reach the Google CMP loader separately', async () => {
  const { loadGoogleCmp } = await import('../site/.vitepress/theme/ad-scripts.mjs');
  const scripts = [];
  const origin = 'https://work-history-4gn.pages.dev';
  const options = { window: { frames: {}, location: { origin, href: origin + '/projects/demo?fc=alwaysshow&fctype=gdpr' } },
    document: { createElement: () => ({ style: {} }), head: { appendChild: script => scripts.push(script) }, body: { appendChild() {} } },
    origin, publisher: 'ca-pub-9486681340475427' };
  const pending = loadGoogleCmp(options);
  const url = new URL(scripts[0].src);
  assert.equal(url.searchParams.get('fc'), 'alwaysshow');
  assert.equal(url.searchParams.get('fctype'), 'gdpr');
  scripts[0].onload();
  await pending;
});
