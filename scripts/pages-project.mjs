import { lstatSync, readFileSync } from 'node:fs';
import { readSiteConfig } from './site-config.mjs';

export function validProjectName(name) {
  return typeof name === 'string' && name === name.trim() && /^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/.test(name);
}

/** Public identity only. This file must never carry credentials or enable deployment. */
export function validatePagesProject(value) {
  if (!value || Array.isArray(value) || value.schemaVersion !== 1 || !validProjectName(value.projectName) ||
      Object.keys(value).sort().join(',') !== 'origin,projectName,schemaVersion') throw new Error('Invalid public Pages identity');
  readSiteConfig({ SITE_TARGET: 'pages', SITE_ORIGIN: value.origin });
  return { schemaVersion: 1, projectName: value.projectName, origin: value.origin };
}

export function readPagesProject(file = new URL('../site/pages.project.json', import.meta.url)) {
  let info;
  try { info = lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) throw new Error('Invalid public Pages identity file');
  let value;
  try { value = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('Public Pages identity must be valid JSON'); }
  return validatePagesProject(value);
}

/** Use the API's actual subdomain, not an assumed project-name.pages.dev address. */
export function identityFromProject(project, name) {
  if (!project || project.name !== name || project.production_branch !== 'main' || project.source || project.uses_functions === true) {
    throw new Error('Expected a main-branch Direct Upload project without Functions; existing project was not modified.');
  }
  if (project.build_config?.build_command) throw new Error('Existing project has a Cloudflare build command; review it first.');
  const nonempty = value => value != null && (typeof value !== 'object' ? value !== '' : Object.keys(value).length > 0);
  for (const kind of ['production', 'preview']) {
    const config = project.deployment_configs?.[kind];
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Cannot verify Pages deployment configuration');
    if (Object.entries(config).some(([key, value]) => /bindings|namespaces|databases|buckets|services|browsers|queue|env_vars|send_email|analytics_engine_datasets|mtls_certificates/.test(key) && nonempty(value))) {
      throw new Error('Existing Pages project has runtime bindings or environment variables; no changes were made.');
    }
  }
  return validatePagesProject({ schemaVersion: 1, projectName: name, origin: `https://${project.subdomain}` });
}
