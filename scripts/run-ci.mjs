import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** An explicit list of checks: never deploy, call a model, or access cloud secrets. */
export function checkCommands(impact) {
  const commands = [];
  if (impact.docsCheck) commands.push(['node', 'scripts/validate-docs.mjs']);
  if (impact.build || impact.workerTest || impact.mermaid) commands.push(['npm', 'ci']);
  if (impact.mermaid) commands.push(['npm', 'run', 'test:mermaid']);
  if (impact.unit || impact.workerTest) commands.push(['npm', 'run', 'docs:prepare']);
  if (impact.unit) commands.push(['npm', 'test']);
  if (impact.workerTest) commands.push(['npm', 'run', 'test:worker']);
  if (impact.build) commands.push(['npm', 'run', 'docs:build']);
  return commands;
}

export function runChecks(impact, execute = command => execFileSync(command[0], command.slice(1), { stdio: 'inherit' })) {
  for (const command of checkCommands(impact)) {
    console.log(`Check: ${command.join(' ')}`);
    execute(command);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const impact = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  for (const flag of ['docsCheck', 'site', 'build', 'unit', 'worker', 'workerTest', 'mermaid']) {
    if (typeof impact[flag] !== 'boolean') throw new Error(`Missing check flag: ${flag}`);
  }
  runChecks(impact);
}
