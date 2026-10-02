import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSiteConfig } from './site-config.mjs';

/** Run after prepare-site clears generated content. Never put hand-written pages there. */
export async function preparePublic(config, root = path.resolve(import.meta.dirname, '..')) {
  const output = path.join(root, 'site/content');
  const publicDir = path.join(output, 'public');
  await mkdir(publicDir, { recursive: true });
  for (const name of ['about', 'privacy']) await copyFile(path.join(root, `site/pages/${name}.md`), path.join(output, `${name}.md`));
  await copyFile(path.join(root, 'site/assets/favicon.png'), path.join(publicDir, 'favicon.png'));
  // Also safe when this generator is run alone after a previous verify build.
  for (const file of ['ads.txt', 'robots.txt']) await rm(path.join(publicDir, file), { force: true });
  if (config.adsMode === 'verify') {
    await writeFile(path.join(publicDir, 'ads.txt'), `google.com, ${config.publisherId.slice(3)}, DIRECT, f08c47fec0942fa0\n`);
  }
  if (config.base === '/') {
    const original = await readFile(path.join(root, 'security/domain-root/robots.txt'), 'utf8');
    if (!original.includes('Disallow: /work-history/')) throw new Error('Review the source crawler policy before changing its base');
    const robots = original.replaceAll('Disallow: /work-history/', 'Disallow: /');
    await writeFile(path.join(publicDir, 'robots.txt'), `${robots.trimEnd()}\n\nSitemap: ${config.origin}/sitemap.xml\n`);
  }
  console.log(`Public pages prepared (${config.target}, ads=${config.adsMode}). No advertising scripts generated.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await preparePublic(readSiteConfig());
}
