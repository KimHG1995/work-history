import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publisher = 'ca-pub-1234567890123456'; // Synthetic fixture only.
function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'site-public-'));
  for (const folder of ['scripts', 'site/pages', 'site/assets', 'projects/demo', 'security/domain-root']) mkdirSync(path.join(dir, folder), { recursive: true });
  for (const file of ['scripts/site-config.mjs', 'scripts/prepare-public.mjs', 'scripts/prepare-site.mjs', 'scripts/prepare-chat.mjs', 'security/domain-root/robots.txt']) {
    if (existsSync(path.join(root, file))) cpSync(path.join(root, file), path.join(dir, file));
  }
  const fixtures = {
    'experience.md': '# 경력\n\n공개 경력의 내용을 검색할 수 있는 테스트 문서입니다. 내용과 주소를 함께 확인합니다.\n',
    'timeline.md': '# 기간\n\n기간 정보를 검색할 수 있도록 충분한 길이로 만든 테스트용 공개 문서입니다.\n',
    'projects/demo/README.md': '# 개요\n\n| 프로젝트 구분 | 사이드 |\n',
    'projects/demo/task.md': '# 작업\n\n실제 업무 기록이 아닌 테스트 문서입니다. 충분한 길이로 검색 색인과 링크를 확인합니다.\n',
    'site/pages/about.md': '# 소개\n\n고정 소개 원본\n',
    'site/pages/privacy.md': '# 개인정보 안내\n\n고정 개인정보 안내 원본\n'
  };
  for (const [name, text] of Object.entries(fixtures)) writeFileSync(path.join(dir, name), text);
  writeFileSync(path.join(dir, 'site/assets/favicon.svg'), '<svg>favicon-fixture</svg>');
  const execute = (script, extra = {}) => {
    const env = { ...process.env };
    for (const key of ['SITE_TARGET', 'SITE_ORIGIN', 'SITE_BASE', 'ADS_MODE', 'ADS_PUBLISHER_ID', 'ADS_CSP_MODE', 'ADS_SLOT_ID']) delete env[key];
    return spawnSync(process.execPath, [script], { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8', timeout: 10000 });
  };
  return { dir, execute, read: file => readFileSync(path.join(dir, file), 'utf8'), has: file => existsSync(path.join(dir, file)), close: () => rmSync(dir, { recursive: true, force: true }) };
}
const pages = { SITE_TARGET: 'pages', SITE_ORIGIN: 'https://validation-only.pages.dev' };
const verify = { ...pages, ADS_MODE: 'verify', ADS_PUBLISHER_ID: publisher };

test('public pages survive generated content removal and do not enter the AI corpus', () => {
  const f = setup();
  try {
    for (let i = 0; i < 2; i++) {
      const result = f.execute('scripts/prepare-site.mjs'); assert.equal(result.status, 0, result.stderr);
      assert.match(f.read('site/content/privacy.md'), /고정 개인정보 안내 원본/);
      assert.match(f.read('site/content/about.md'), /고정 소개 원본/);
      assert.equal(f.read('site/content/public/favicon.svg'), '<svg>favicon-fixture</svg>');
    }
    const indexed = f.execute('scripts/prepare-chat.mjs'); assert.equal(indexed.status, 0, indexed.stderr);
    assert.doesNotMatch(f.read('site/content/public/chat-docs.json'), /고정 개인정보|고정 소개/);
  } finally { f.close(); }
});

test('verify generates plain-text root ads.txt and preserves AI crawler restrictions', () => {
  const f = setup();
  try {
    const result = f.execute('scripts/prepare-site.mjs', verify); assert.equal(result.status, 0, result.stderr);
    assert.equal(f.read('site/content/public/ads.txt'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    const robots = f.read('site/content/public/robots.txt');
    for (const bot of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Amazonbot', 'Applebot-Extended', 'Bytespider', 'Meta-ExternalAgent']) assert.ok(robots.includes(`User-agent: ${bot}`));
    assert.match(robots, /Disallow: \/\n/);
    assert.match(robots, /User-agent: \*\nAllow: \/\n/);
    assert.ok(robots.includes(`Sitemap: ${pages.SITE_ORIGIN}/sitemap.xml`));
    assert.doesNotMatch(robots, /\/work-history\/|Mediapartners-Google\nDisallow/);
  } finally { f.close(); }
});

test('off cleanup removes old verification assets but preserves unrelated static assets', () => {
  const f = setup();
  try {
    assert.equal(f.execute('scripts/prepare-site.mjs', verify).status, 0);
    writeFileSync(path.join(f.dir, 'site/content/public/keep.txt'), 'preserved');
    const result = f.execute('scripts/prepare-public.mjs', pages); assert.equal(result.status, 0, result.stderr);
    assert.equal(f.has('site/content/public/ads.txt'), false);
    assert.equal(f.read('site/content/public/keep.txt'), 'preserved');
    const github = f.execute('scripts/prepare-public.mjs'); assert.equal(github.status, 0, github.stderr);
    assert.equal(f.has('site/content/public/robots.txt'), false, 'project subpath robots must not be mistaken for root policy');
  } finally { f.close(); }
});

test('chat source links and public links follow both target bases', () => {
  const f = setup();
  try {
    for (const env of [{}, pages]) {
      const result = f.execute('scripts/prepare-chat.mjs', env); assert.equal(result.status, 0, result.stderr);
      const docs = JSON.parse(f.read('site/content/public/chat-docs.json'));
      const base = env.SITE_TARGET === 'pages' ? '/' : '/work-history/';
      assert.ok(docs.some(doc => doc.url === base));
      assert.ok(docs.some(doc => doc.url === `${base}projects/demo/task`));
      assert.equal(f.read('site/content/public/chat-docs.json'), f.read('worker/generated/docs.json'));
    }
  } finally { f.close(); }
});

test('invalid configuration is rejected before deleting existing generated content', () => {
  const f = setup();
  try {
    mkdirSync(path.join(f.dir, 'site/content'), { recursive: true });
    writeFileSync(path.join(f.dir, 'site/content/sentinel.txt'), 'existing');
    const result = f.execute('scripts/prepare-site.mjs', { ...pages, ADS_MODE: 'verify' });
    assert.notEqual(result.status, 0);
    assert.equal(f.read('site/content/sentinel.txt'), 'existing');
  } finally { f.close(); }
});
