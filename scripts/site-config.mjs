const githubOrigin = 'https://kimhg1995.github.io';
const pagesOrigin = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.pages\.dev$/;

function value(env, key, fallback = '') {
  const raw = env[key];
  if (raw !== undefined && typeof raw !== 'string') throw new Error(`Invalid ${key}`);
  return raw === undefined || raw === '' ? fallback : raw;
}

/** No account calls, secrets, or inferred deployment hostname. */
export function readSiteConfig(env = process.env) {
  const target = value(env, 'SITE_TARGET', 'github');
  if (!['github', 'pages'].includes(target)) throw new Error('Invalid SITE_TARGET');
  const origin = value(env, 'SITE_ORIGIN', target === 'github' ? githubOrigin : '');
  if (!origin || (target === 'github' ? origin !== githubOrigin : !pagesOrigin.test(origin) || new URL(origin).origin !== origin)) {
    throw new Error('Invalid SITE_ORIGIN: supply the exact production HTTPS origin');
  }
  const base = value(env, 'SITE_BASE', target === 'github' ? '/work-history/' : '/');
  if (base !== (target === 'github' ? '/work-history/' : '/')) throw new Error('SITE_BASE does not match SITE_TARGET');
  const adsMode = value(env, 'ADS_MODE', 'off');
  if (adsMode === 'enabled') throw new Error('ADS_MODE=enabled is unavailable until CSP and consent integration are approved');
  if (!['off', 'verify'].includes(adsMode)) throw new Error('Invalid ADS_MODE');
  const cspMode = value(env, 'ADS_CSP_MODE', 'strict');
  if (cspMode !== 'strict') throw new Error('CSP relaxation is not available in verification-only builds');
  let publisherId = '';
  if (adsMode === 'verify') {
    if (target !== 'pages') throw new Error('AdSense verification requires the root Pages target');
    publisherId = value(env, 'ADS_PUBLISHER_ID');
    if (publisherId.length !== 23 || !/^ca-pub-\d{16}$/.test(publisherId)) throw new Error('Invalid ADS_PUBLISHER_ID');
  }
  return Object.freeze({ target, origin, base, adsMode, publisherId, slotId: '', cspMode });
}

/** Convert a source/output filename to the same clean URL used by the public site. */
export function pageUrl(config, file) {
  if (typeof file !== 'string' || !file || file.startsWith('/') || /[\\?#:]/.test(file) || file.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('Invalid page path');
  }
  if (/^404\.(md|html)$/.test(file)) return null;
  const clean = file.replace(/\.(md|html)$/, '').replace(/(^|\/)index$/, '$1');
  return config.origin + config.base + clean.split('/').map(encodeURIComponent).join('/');
}

export function verificationHead(config) {
  return config.adsMode === 'verify' ? [['meta', { name: 'google-adsense-account', content: config.publisherId }]] : [];
}

// Page-data hooks keep canonical metadata in sync during VitePress SPA navigation too.
export function applyPageMetadata(page, config) {
  const canonical = pageUrl(config, page.relativePath);
  page.frontmatter ??= {};
  const head = (page.frontmatter.head ?? []).filter(([tag, attrs]) =>
    !(tag === 'link' && attrs?.rel === 'canonical') &&
    !(tag === 'meta' && attrs?.name === 'google-adsense-account'));
  page.frontmatter.head = [...head, ...(canonical
    ? [['link', { rel: 'canonical', href: canonical }], ...verificationHead(config)]
    : [['meta', { name: 'robots', content: 'noindex' }]])];
}
