import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedPaths, mayDeploy } from './ci-changes.mjs';

/** Read latest main inside the deployment queue, not at build start. */
export function productionInputsCurrent({ cwd = process.cwd(), sha, ref }) {
  if (ref !== 'refs/heads/main' || typeof sha !== 'string' || sha.length !== 40 || !/^[a-f0-9]{40}$/.test(sha) || /^0+$/.test(sha)) throw new Error('Only a verified main commit may deploy.');
  execFileSync('git', ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { cwd, stdio: 'pipe', timeout: 30000 });
  const latest = execFileSync('git', ['rev-parse', 'refs/remotes/origin/main'], { cwd, encoding: 'utf8' }).trim();
  execFileSync('git', ['merge-base', '--is-ancestor', sha, latest], { cwd, stdio: 'pipe' });
  return mayDeploy(changedPaths(cwd, sha, latest));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const deploy = productionInputsCurrent({ sha: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF });
  if (!process.env.GITHUB_OUTPUT) throw new Error('Missing GitHub output file.');
  appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
  console.log(deploy ? 'Production inputs are current; deployment allowed.' : 'Newer production inputs exist; skipping this outdated artifact.');
}
