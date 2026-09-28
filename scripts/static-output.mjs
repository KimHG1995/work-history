import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const forbidden = name => /^(?:functions|_worker\.js|_routes\.json|\.git|\.wrangler|\.dev\.vars(?:\..*)?|\.env(?:\..*)?|wrangler\.(?:jsonc?|toml))$/i.test(name);
async function present(file) {
  try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/** Template uses the strict JSON subset of JSONC, with no runtime configuration. */
export async function readStaticConfig(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid static config file');
  const config = JSON.parse(await readFile(file, 'utf8'));
  const date = config?.compatibility_date;
  if (!config || Array.isArray(config) || Object.keys(config).some(key => !['pages_build_output_dir', 'compatibility_date'].includes(key)) ||
      config.pages_build_output_dir !== './dist' || typeof date !== 'string' || date.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Only static Pages configuration is allowed; bindings, migrations and env are forbidden.');
  }
  return config;
}

/** Refuse executable Pages entries and accidental secret files before any upload. */
export async function assertStaticOutput(output, { root = process.cwd() } = {}) {
  const config = await readStaticConfig(path.join(root, 'wrangler.pages.jsonc'));
  for (const name of ['functions', '_worker.js']) {
    if (await present(path.join(root, name))) throw new Error(`Forbidden static workspace entry: ${name}`);
  }
  let count = 0;
  async function walk(file) {
    const info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error('Static output cannot contain symlinks');
    if (info.isDirectory()) {
      for (const name of await readdir(file)) {
        if (forbidden(name)) throw new Error(`Forbidden static output entry: ${name}`);
        await walk(path.join(file, name));
      }
    } else if (info.isFile()) {
      if (++count > 20000 || info.size > 25 * 1024 * 1024) throw new Error('Static output exceeds Pages upload limits');
    } else throw new Error('Static output must contain only regular files and directories');
  }
  const info = await lstat(output);
  if (info.isSymbolicLink()) throw new Error('Static output cannot contain symlinks');
  if (!info.isDirectory()) throw new Error('Static output directory is required');
  await walk(output);
  if (!count || !(await present(path.join(output, 'index.html')))?.isFile()) throw new Error('Static output requires index.html');
  return config;
}
