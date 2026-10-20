import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../site/.vitepress/dist');
const base = process.env.SITE_BASE || '/work-history/';

function findChrome() {
  for (const executable of [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (result.status === 0) return executable;
  }
  throw new Error('Chrome/Chromium is required for Mermaid rendering verification');
}

const mime = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = createServer(async (request, response) => {
  try {
    const urlPath = new URL(request.url, 'http://localhost').pathname;
    if (!urlPath.startsWith(base)) { response.writeHead(404).end(); return; }
    let relative = decodeURIComponent(urlPath.slice(base.length));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    else if (!path.posix.extname(relative)) relative += '.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});

const profile = await mkdtemp(path.join(tmpdir(), 'mermaid-render-'));
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = 'http://127.0.0.1:' + server.address().port + base + 'projects/hr-saas/mvp';
  const { stdout } = await execFileAsync(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--user-data-dir=' + profile,
    '--window-size=1440,900', '--virtual-time-budget=20000', '--dump-dom', url
  ], { timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  const diagrams = [...stdout.matchAll(/<div\b[^>]*class="[^"]*\bdiagram-canvas\b[^"]*"[^>]*>([\s\S]*?)<\/svg>\s*<\/div>/g)]
    .map(match => match[1]);
  assert.equal(diagrams.length, 3, 'Expected three rendered HR SaaS diagrams, received ' + diagrams.length);
  for (const [index, diagram] of diagrams.entries()) {
    assert.doesNotMatch(diagram, /<foreignObject\b/i, 'Diagram ' + (index + 1) + ' still uses HTML labels');
    assert.match(diagram, /<text\b/i, 'Diagram ' + (index + 1) + ' has no SVG text labels');
  }
  console.log('Mermaid browser render verified: ' + diagrams.length + ' diagrams, SVG text labels, no foreignObject.');
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
