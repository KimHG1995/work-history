import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { changedPaths, mayDeploy } from './ci-changes.mjs';

if (process.env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '')) {
  throw new Error('Only a verified main commit may deploy.');
}
// Read latest main inside the deployment queue, not at build start.
execFileSync('git', ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { stdio: 'pipe' });
const latest = execFileSync('git', ['rev-parse', 'refs/remotes/origin/main'], { encoding: 'utf8' }).trim();
const deploy = mayDeploy(changedPaths(process.cwd(), process.env.GITHUB_SHA, latest));
if (!process.env.GITHUB_OUTPUT) throw new Error('Missing GitHub output file.');
appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
console.log(deploy ? 'Production inputs are current; deployment allowed.' : 'Newer production inputs exist; skipping this outdated artifact.');
