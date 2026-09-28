import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSiteConfig } from './site-config.mjs';
import { resolveChatApiUrl } from '../site/chat.config.mjs';

export const validSha = value => typeof value === 'string' && value.length === 40 && /^[a-f0-9]{40}$/.test(value) && !/^0+$/.test(value);
const projectPattern = /^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/;

/** Capture public deployment inputs once. No account lookup or credentials in build jobs. */
export function selectDeployment(env) {
  const configured = env.SITE_TARGET || 'github';
  if (!['github', 'pages'].includes(configured)) throw new Error('Invalid SITE_TARGET');
  const requested = env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? (env.DEPLOY_TARGET || 'configured') : 'configured';
  if (!['configured', 'github', 'pages'].includes(requested)) throw new Error('Invalid deployment target');
  const target = requested === 'configured' ? configured : requested;
  if (target === 'pages' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.PAGES_DEPLOY_CONFIRMED !== 'true') {
    throw new Error('Confirm the manual Pages deployment first.');
  }
  if (!validSha(env.GITHUB_SHA)) throw new Error('Invalid deployment commit');
  // Pages-only settings may be prepared without changing the live GitHub site.
  const config = readSiteConfig(target === 'github' ? { SITE_TARGET: 'github' } : {
    SITE_TARGET: 'pages', SITE_ORIGIN: env.SITE_ORIGIN, ADS_MODE: env.ADS_MODE,
    ADS_PUBLISHER_ID: env.ADS_PUBLISHER_ID, ADS_CSP_MODE: env.ADS_CSP_MODE
  });
  const projectName = target === 'pages' ? env.CLOUDFLARE_PAGES_PROJECT : '';
  if (target === 'pages' && (typeof projectName !== 'string' || projectName !== projectName.trim() || !projectPattern.test(projectName))) throw new Error('Invalid CLOUDFLARE_PAGES_PROJECT');
  return {
    schemaVersion: 1, sha: env.GITHUB_SHA, projectName,
    siteEnv: {
      SITE_TARGET: config.target, SITE_ORIGIN: config.origin, SITE_BASE: config.base,
      ADS_MODE: config.adsMode, ADS_PUBLISHER_ID: config.publisherId, ADS_CSP_MODE: config.cspMode,
      VITE_CHAT_API_URL: resolveChatApiUrl(env.VITE_CHAT_API_URL) || 'off'
    }
  };
}

/** Revalidate artifact metadata instead of trusting arbitrary JSON environment fields. */
export function validateDeployment(record, sha) {
  if (!record || record.schemaVersion !== 1 || record.sha !== sha || !record.siteEnv || !validSha(sha)) throw new Error('Invalid deployment metadata');
  const normalized = selectDeployment({ ...record.siteEnv, GITHUB_SHA: sha, GITHUB_EVENT_NAME: 'push', CLOUDFLARE_PAGES_PROJECT: record.projectName });
  const sameKeys = (a, b) => JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort());
  if (!sameKeys(record, normalized) || !sameKeys(record.siteEnv, normalized.siteEnv) ||
      record.projectName !== normalized.projectName || Object.keys(normalized.siteEnv).some(key => record.siteEnv[key] !== normalized.siteEnv[key])) {
    throw new Error('Inconsistent deployment metadata');
  }
  return normalized;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2] || !process.env.GITHUB_OUTPUT) throw new Error('Missing deployment output paths');
  const record = selectDeployment(process.env);
  writeFileSync(process.argv[2], JSON.stringify(record));
  appendFileSync(process.env.GITHUB_OUTPUT, `target=${record.siteEnv.SITE_TARGET}\n`);
  console.log(`Static build target: ${record.siteEnv.SITE_TARGET}, ads=${record.siteEnv.ADS_MODE}`);
}
