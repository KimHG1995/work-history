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
    assert.equal(eligibleAdDocument(url, long), url === 'projects/README.md');
  }
  assert.equal(eligibleAdDocument('projects/demo.md', '# 짧은 소개'), false);
  assert.equal(eligibleAdDocument('projects/demo.md', long + '\nads: false'), false);
});
