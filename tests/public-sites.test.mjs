import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { hashDocuments } from '../worker/docs-version.mjs';
const github = 'https://kimhg1995.github.io';
const pages = JSON.parse(readFileSync(new URL('../site/pages.project.json', import.meta.url))).origin;
async function load() {
  assert.ok(existsSync(new URL('../worker/public-sites.mjs', import.meta.url)), 'Pages-aware Worker access is not implemented');
  return import('../worker/public-sites.mjs');
}
const corpus = [
  {title:'경력',text:'공개 경력',url:'/work-history/',group:'',category:''},
  {title:'연혁',text:'공개 연혁',url:'/work-history/timeline',group:'',category:''},
  {title:'쿠폰',text:'공개 프로젝트',url:'/work-history/projects/coupon/task',group:'개발',category:'회사'}
];
test('only the exact saved production origins are allowed', async () => {
  const { publicSite, publicSites } = await load();
  assert.deepEqual(publicSites.map(site => site.origin), [github,pages]);
  assert.equal(publicSite(github).base,'/work-history/');
  assert.equal(publicSite(pages).base,'/');
  for (const value of [null,undefined,'null','*',pages+'/',pages+'/path',pages+'.evil.test',pages.replace('https:','http:'),pages.replace('https://','https://preview.'),'https://other.pages.dev',github+'\n']) {
    assert.equal(publicSite(value),null,String(value));
  }
});
test('host-specific indexes preserve content and produce the exact browser digest', async () => {
  const { publicSite, documentsForSite } = await load();
  const expected = corpus.map(doc => ({...doc,url:doc.url.replace('/work-history/','/')}));
  const pagesDocs = documentsForSite(corpus,publicSite(pages));
  assert.deepEqual(pagesDocs,expected);
  assert.deepEqual(documentsForSite(corpus,publicSite(github)),corpus);
  assert.deepEqual(documentsForSite(expected,publicSite(github)),corpus);
  assert.equal(await hashDocuments(pagesDocs),await hashDocuments(expected));
  assert.notEqual(await hashDocuments(pagesDocs),await hashDocuments(corpus));
  assert.equal(corpus[0].url,'/work-history/');
});
test('rebasing rejects unexpected and unsafe generated paths', async () => {
  const { publicSite, documentsForSite } = await load();
  for (const url of ['https://evil.test','//evil.test','/unknown','/projects/../secret','/projects/%2e%2e/private','/projects/x?token=y','/projects/\\evil']) {
    assert.throws(() => documentsForSite([{...corpus[0],url}],publicSite(pages)),undefined,url);
  }
});
test('request-specific CORS wraps streamed replies without leaking another site', async () => {
  const { publicSite, withSiteCors } = await load();
  for (const code of [200,400,409,429,503]) {
    const original = Response.json({code:'test'}, {status:code,headers:{'Access-Control-Allow-Origin':github,'Retry-After':'7','Vary':'Accept-Encoding'}});
    const reply = withSiteCors(original,publicSite(pages));
    assert.equal(reply.status,code);
    assert.equal(reply.headers.get('Access-Control-Allow-Origin'),pages);
    assert.equal(reply.headers.get('Retry-After'),'7');
    assert.match(reply.headers.get('Vary'),/Origin/);
    assert.match(reply.headers.get('Vary'),/Accept-Encoding/);
    assert.deepEqual(await reply.json(),{code:'test'});
  }
  const anonymous=withSiteCors(new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':github}}),null);
  assert.equal(anonymous.headers.get('Access-Control-Allow-Origin'),null);
});
