import test from 'node:test';
import assert from 'node:assert/strict';
import { readSiteConfig, pageUrl, verificationHead, applyPageMetadata } from '../scripts/site-config.mjs';

// Test inputs only. This host and publisher are never deployed or contacted.
const pages = { SITE_TARGET: 'pages', SITE_ORIGIN: 'https://validation-only.pages.dev' };
const publisher = 'ca-pub-1234567890123456';

test('existing GitHub defaults survive missing and empty configuration', () => {
  for (const env of [{}, { SITE_TARGET: '', SITE_ORIGIN: '', SITE_BASE: '', ADS_MODE: '', ADS_CSP_MODE: '' }]) {
    const config = readSiteConfig(env);
    assert.equal(config.target, 'github');
    assert.equal(config.origin, 'https://kimhg1995.github.io');
    assert.equal(config.base, '/work-history/');
    assert.equal(config.adsMode, 'off');
    assert.equal(config.cspMode, 'strict');
  }
});

test('Pages requires an exact user-selected root origin without guessing a hostname', () => {
  assert.throws(() => readSiteConfig({ SITE_TARGET: 'pages' }), /SITE_ORIGIN/);
  assert.equal(readSiteConfig(pages).base, '/');
  for (const origin of ['http://validation-only.pages.dev', 'https://x.pages.dev/', 'https://user:pass@x.pages.dev', 'https://x.pages.dev:443', 'https://x.pages.dev?q=x', 'https://x.pages.dev#x', 'https://preview.x.pages.dev', 'https://x.pages.dev.evil.test', 'https://-x.pages.dev', 'https://x-.pages.dev', 'not a url']) {
    assert.throws(() => readSiteConfig({ ...pages, SITE_ORIGIN: origin }), /SITE_ORIGIN/);
  }
});

test('target and base mismatches cannot produce a broken production bundle', () => {
  for (const env of [{ SITE_TARGET: 'other' }, { SITE_BASE: '/' }, { ...pages, SITE_BASE: '/work-history/' }, { SITE_ORIGIN: pages.SITE_ORIGIN }]) {
    assert.throws(() => readSiteConfig(env));
  }
});

test('verify uses only a valid publisher ID, with no ad loader', () => {
  const config = readSiteConfig({ ...pages, ADS_MODE: 'verify', ADS_PUBLISHER_ID: publisher });
  assert.deepEqual(verificationHead(config), [['meta', { name: 'google-adsense-account', content: publisher }]]);
  for (const id of ['', 'pub-1234567890123456', 'ca-pub-123', publisher + '\n', `${publisher}" onclick="evil`]) {
    assert.throws(() => readSiteConfig({ ...pages, ADS_MODE: 'verify', ADS_PUBLISHER_ID: id }), /ADS_PUBLISHER_ID/);
  }
  assert.throws(() => readSiteConfig({ ADS_MODE: 'verify', ADS_PUBLISHER_ID: publisher }), /root|Pages/);
});

test('off removes stale publisher identity instead of accidentally keeping verification enabled', () => {
  const config = readSiteConfig({ ...pages, ADS_MODE: 'off', ADS_PUBLISHER_ID: publisher, ADS_SLOT_ID: '123' });
  assert.equal(config.publisherId, '');
  assert.equal(config.slotId, '');
  assert.deepEqual(verificationHead(config), []);
});

test('enabled and CSP relaxation stay blocked until the consent and security phase', () => {
  assert.throws(() => readSiteConfig({ ...pages, ADS_MODE: 'enabled', ADS_PUBLISHER_ID: publisher, ADS_SLOT_ID: '123', ADS_CSP_MODE: 'static-ads' }));
  assert.throws(() => readSiteConfig({ ...pages, ADS_MODE: 'enabled', ADS_PUBLISHER_ID: publisher }), /enabled/);
  assert.throws(() => readSiteConfig({ ...pages, ADS_CSP_MODE: 'static-ads' }), /CSP/);
  assert.throws(() => readSiteConfig({ ...pages, ADS_MODE: 'VERIFY' }), /ADS_MODE/);
});

test('canonical and chat routes share one base with clean index routes', () => {
  for (const config of [readSiteConfig({}), readSiteConfig(pages)]) {
    assert.equal(pageUrl(config, 'index.md'), config.origin + config.base);
    assert.equal(pageUrl(config, 'projects/demo/index.md'), config.origin + config.base + 'projects/demo/');
    assert.equal(pageUrl(config, 'projects/demo/task.md'), config.origin + config.base + 'projects/demo/task');
    assert.equal(pageUrl(config, 'timeline.html'), config.origin + config.base + 'timeline');
    assert.equal(pageUrl(config, '404.md'), null);
    for (const invalid of ['../private.md', '/index.md', 'https://evil.test', 'x?y.md', 'x#y.md', 'x\\y.md']) assert.throws(() => pageUrl(config, invalid));
  }
});

test('page metadata keeps existing tags, replaces canonical, and excludes 404', () => {
  const config = readSiteConfig(pages);
  const page = { relativePath: 'about.md', frontmatter: { head: [['meta', { name: 'description', content: 'kept' }], ['link', { rel: 'canonical', href: 'https://wrong.test' }]] } };
  applyPageMetadata(page, config);
  assert.equal(page.frontmatter.head.length, 2);
  assert.deepEqual(page.frontmatter.head.at(-1), ['link', { rel: 'canonical', href: `${config.origin}/about` }]);
  const errorPage = { relativePath: '404.md', frontmatter: {} };
  applyPageMetadata(errorPage, config);
  assert.deepEqual(errorPage.frontmatter.head, [['meta', { name: 'robots', content: 'noindex' }]]);
});
