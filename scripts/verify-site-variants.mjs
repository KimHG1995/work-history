import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const inputs = new Set([
  'scripts/site-config.mjs', 'scripts/prepare-public.mjs', 'scripts/prepare-site.mjs',
  'scripts/prepare-chat.mjs', 'scripts/secure-site.mjs', 'scripts/verify-site-output.mjs',
  'scripts/verify-site-variants.mjs', 'site/.vitepress/config.mjs', 'site/chat.config.mjs',
  'package.json', 'package-lock.json', 'security/domain-root/robots.txt', '.github/workflows/docs-check.yml'
]);
export function needsSiteVariant(impact, eventName) {
  return ['pull_request', 'merge_group'].includes(eventName) && impact.build === true &&
    (impact.fallback === true || impact.paths.some(file => inputs.has(file) || file.startsWith('site/pages/')));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const impact = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (needsSiteVariant(impact, process.env.GITHUB_EVENT_NAME)) {
    // Synthetic verification build only. PR has no upload step and no cloud credentials.
    execFileSync('npm', ['run', 'docs:build'], { stdio: 'inherit', env: {
      ...process.env, SITE_TARGET: 'pages', SITE_ORIGIN: 'https://validation-only.pages.dev',
      SITE_BASE: '/', ADS_MODE: 'verify', ADS_CSP_MODE: 'strict',
      ADS_PUBLISHER_ID: 'ca-pub-1234567890123456', ADS_SLOT_ID: ''
    } });
  } else {
    console.log('Alternate target build skipped: no relevant configuration changes.');
  }
}
