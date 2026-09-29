import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Select a Secret NAME, never read its value or fall back from an empty Secret. */
export function resolvePagesToken(value) {
  const name = value === undefined || value === '' ? 'CLOUDFLARE_API_TOKEN' : value;
  if (!['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_PAGES_API_TOKEN'].includes(name)) throw new Error('Unsupported Pages token Secret name');
  return name;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('Missing GitHub output file');
  appendFileSync(process.env.GITHUB_OUTPUT, `name=${resolvePagesToken(process.env.PAGES_TOKEN_SECRET)}\n`);
}
