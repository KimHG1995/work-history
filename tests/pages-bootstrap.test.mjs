import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { selectDeployment } from '../scripts/pages-config.mjs';
const sha = 'a'.repeat(40);
const env = { GITHUB_SHA: sha, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
  PAGES_BOOTSTRAP_CONFIRMED: 'true', PAGES_BOOTSTRAP_PROJECT: 'work-history',
  BOOTSTRAP_TOKEN_SECRET: 'CLOUDFLARE_PAGES_API_TOKEN', CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_PAGES_API_TOKEN: 'test-token-never-log' };
const identity = { schemaVersion: 1, projectName: 'work-history', origin: 'https://work-history-actual.pages.dev' };
const project = () => ({ name: identity.projectName, subdomain: identity.origin.slice(8), production_branch: 'main',
  source: null, uses_functions: false, deployment_configs: { production: {}, preview: {} } });
const ok = value => Response.json({ success: true, result: value });
const missing = () => Response.json({ success: false, errors: [{ code: 8000007, message: 'not found' }] }, { status: 404 });
async function load() {
  assert.ok(existsSync(new URL('../scripts/bootstrap-pages.mjs', import.meta.url)), 'first-time Pages setup is not implemented');
  return { ...await import('../scripts/bootstrap-pages.mjs'), ...await import('../scripts/pages-project.mjs') };
}

test('existing project is reused read-only and SITE_ORIGIN comes from actual subdomain', async () => {
  const { bootstrapPages } = await load(); const calls = [];
  const result = await bootstrapPages({ env, current: () => true, fetchImpl: async (url, init) => {
    calls.push([url, init]); return ok(project());
  } });
  assert.equal(result.created, false); assert.deepEqual(result.project, identity);
  assert.equal(calls.length, 1); assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][0], `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/work-history`);
  assert.equal(calls[0][1].redirect, 'error');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-token-never-log');
  assert.equal(result.deployment.siteEnv.SITE_ORIGIN, identity.origin);
  assert.equal(result.deployment.siteEnv.ADS_MODE, 'off');
  assert.doesNotMatch(JSON.stringify(result), /test-token|Authorization/);
});

test('only explicit project-not-found creates once, then reads back the identity', async () => {
  const { bootstrapPages } = await load(); const calls = [];
  const result = await bootstrapPages({ env, current: () => true, fetchImpl: async (url, init) => {
    calls.push([url, init]);
    return calls.length === 1 ? missing() : calls.length === 2 ? ok({ name: 'work-history' }) : ok(project());
  } });
  assert.equal(result.created, true);
  assert.deepEqual(calls.map(([,init]) => init.method), ['GET', 'POST', 'GET']);
  assert.ok(calls[1][0].endsWith('/pages/projects'));
  assert.deepEqual(JSON.parse(calls[1][1].body), { name: 'work-history', production_branch: 'main' });
  assert.deepEqual(result.project, identity);
});

test('authorization, rate limit, server failures and ambiguous 404 never cause creation', async () => {
  const { bootstrapPages } = await load();
  for (const [status, code] of [[401, 10000], [403, 8000007], [429, 8000007], [500, 8000007], [404, 10000]]) {
    const calls = [];
    await assert.rejects(bootstrapPages({ env, current: () => true, fetchImpl: async (_, init) => {
      calls.push(init.method); return Response.json({ success: false, errors: [{ code, message: env.CLOUDFLARE_PAGES_API_TOKEN }] }, {status});
    } }), error => !error.message.includes(env.CLOUDFLARE_PAGES_API_TOKEN));
    assert.deepEqual(calls, ['GET']);
  }
});

test('timeouts and invalid JSON never expose a raw error or retry POST', async () => {
  const { bootstrapPages } = await load();
  for (const mode of ['timeout', 'json', 'post-timeout']) {
    const calls = [];
    await assert.rejects(bootstrapPages({ env, current: () => true, fetchImpl: async (_, init) => {
      calls.push(init.method);
      if (mode === 'post-timeout' && calls.length === 1) return missing();
      if (mode === 'json') return new Response(env.CLOUDFLARE_PAGES_API_TOKEN);
      throw new Error(env.CLOUDFLARE_PAGES_API_TOKEN);
    } }), error => !error.message.includes(env.CLOUDFLARE_PAGES_API_TOKEN));
    assert.deepEqual(calls, mode === 'post-timeout' ? ['GET', 'POST'] : ['GET']);
  }
});

test('failed post-read retains the project and rerun looks it up rather than recreating', async () => {
  const { bootstrapPages } = await load(); let requests = 0;
  await assert.rejects(bootstrapPages({ env, current: () => true, fetchImpl: async () => {
    requests++; return requests === 1 || requests === 3 ? missing() : ok({name:'work-history'});
  } }));
  const calls = [];
  const second = await bootstrapPages({ env, current: () => true, fetchImpl: async (_, init) => { calls.push(init.method); return ok(project()); } });
  assert.equal(second.created, false); assert.deepEqual(calls, ['GET']);
});

test('non-production runs, missing approval, bad IDs and unselected secrets make zero requests', async () => {
  const { bootstrapPages } = await load(); let calls = 0;
  for (const change of [{GITHUB_EVENT_NAME:'push'}, {GITHUB_EVENT_NAME:'pull_request'}, {GITHUB_REF:'refs/heads/feature'},
    {PAGES_BOOTSTRAP_CONFIRMED:'false'}, {GITHUB_SHA:sha+'\n'}, {CLOUDFLARE_ACCOUNT_ID:'b'.repeat(32)+'\n'},
    {CLOUDFLARE_PAGES_API_TOKEN:''}, {PAGES_BOOTSTRAP_PROJECT:'../x'}, {PAGES_BOOTSTRAP_PROJECT:'work-history\n'},
    {BOOTSTRAP_TOKEN_SECRET:'ORCAROUTER_API_KEY'}]) {
    await assert.rejects(bootstrapPages({ env:{...env,...change}, current: () => true, fetchImpl: async () => {calls++; return ok(project());} }));
  }
  assert.equal(calls, 0);
});

test('stale main stops before account access', async () => {
  const { bootstrapPages } = await load(); let calls = 0;
  await assert.rejects(bootstrapPages({ env, current: () => false, fetchImpl: async () => { calls++; return ok(project()); } }), /main|current/i);
  assert.equal(calls, 0);
});

test('source integration, runtime bindings and unsafe origins are not modified or reused', async () => {
  const { bootstrapPages } = await load();
  const changes = [p => {p.source={type:'github'};}, p => {p.name='other';}, p => {p.production_branch='dev';}, p => {p.uses_functions=true;},
    p => {p.deployment_configs.preview.env_vars={PRIVATE:{value:'secret'}};}, p => {p.deployment_configs.production.analytics_engine_datasets={A:{dataset:'x'}};},
    p => {p.deployment_configs.production.mtls_certificates={A:{certificate_id:'x'}};}, p => {delete p.deployment_configs.preview;},
    p => {p.subdomain='preview.work-history.pages.dev';}, p => {p.subdomain='x.pages.dev/';}, p => {p.subdomain='x.pages.dev.evil.test';},
    p => {p.subdomain='x.pages.dev\nunsafe';}, p => {p.build_config={build_command:'npm run build'};}];
  for (const mutate of changes) {
    const value = project(); mutate(value); const calls = [];
    await assert.rejects(bootstrapPages({ env, current: () => true, fetchImpl: async (_, init) => { calls.push(init.method); return ok(value); } }));
    assert.deepEqual(calls, ['GET']);
  }
});

test('bootstrap ignores stale site and advertising variables, retains the public AI default', async () => {
  const { bootstrapPages } = await load();
  const result = await bootstrapPages({ env:{...env, SITE_ORIGIN:'https://old.pages.dev', SITE_TARGET:'github', ADS_MODE:'enabled', ADS_PUBLISHER_ID:'not-valid'},
    current: () => true, fetchImpl: async () => ok(project()) });
  assert.equal(result.deployment.siteEnv.SITE_ORIGIN, identity.origin);
  assert.equal(result.deployment.siteEnv.ADS_MODE,'off'); assert.equal(result.deployment.siteEnv.ADS_CSP_MODE,'strict');
  assert.equal(result.deployment.siteEnv.VITE_CHAT_API_URL,'https://work-history-chat.kim-h-g199510.workers.dev');
});

test('public result files contain only identity and build metadata, not account payload or token', async t => {
  const { bootstrapPages, saveBootstrapResult } = await load();
  const directory = mkdtempSync(path.join(tmpdir(), 'bootstrap-result-')); t.after(() => rmSync(directory,{recursive:true,force:true}));
  const result = await bootstrapPages({ env, current: () => true, fetchImpl: async () => ok(project()) });
  await saveBootstrapResult(directory,result);
  assert.deepEqual(JSON.parse(readFileSync(path.join(directory,'pages-project.json'),'utf8')),identity);
  const serialized = readFileSync(path.join(directory,'deployment.json'),'utf8');
  assert.equal(JSON.parse(serialized).sha,sha);
  assert.doesNotMatch(serialized,/test-token|deployment_configs|bbbbbbbb/);
});

test('saved public project avoids manual SITE_ORIGIN without changing the default target', () => {
  const readProject = () => identity;
  assert.equal(selectDeployment({GITHUB_SHA:sha},{readProject}).siteEnv.SITE_TARGET,'github');
  const result = selectDeployment({GITHUB_SHA:sha,SITE_TARGET:'pages'},{readProject});
  assert.equal(result.siteEnv.SITE_ORIGIN,identity.origin); assert.equal(result.projectName,identity.projectName);
});

test('explicit identity overrides stay paired and do not silently mix with saved identity', () => {
  const readProject = () => identity;
  assert.throws(() => selectDeployment({GITHUB_SHA:sha,SITE_TARGET:'pages',CLOUDFLARE_PAGES_PROJECT:'other'},{readProject}));
  assert.throws(() => selectDeployment({GITHUB_SHA:sha,SITE_TARGET:'pages',SITE_ORIGIN:'https://other.pages.dev'},{readProject}));
  const result = selectDeployment({GITHUB_SHA:sha,SITE_TARGET:'pages',CLOUDFLARE_PAGES_PROJECT:'other',SITE_ORIGIN:'https://other.pages.dev'},
    {readProject: () => {throw Error('Do not read unnecessary saved config');}});
  assert.equal(result.projectName,'other');
  assert.equal(selectDeployment({GITHUB_SHA:sha},{readProject: () => {throw Error('GitHub must not depend on a Pages file');}}).siteEnv.SITE_TARGET,'github');
});

test('public identity reader rejects malformed or credential-bearing files and tolerates absent file', async t => {
  const { readPagesProject } = await load();
  const directory=mkdtempSync(path.join(tmpdir(),'pages-project-')); t.after(() => rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'project.json'); assert.equal(readPagesProject(file),null);
  writeFileSync(file,JSON.stringify(identity)); assert.deepEqual(readPagesProject(file),identity);
  for (const value of [null,[],{...identity,token:'secret'},{...identity,origin:'https://x.pages.dev/path'},{...identity,projectName:'x\n'}]) {
    writeFileSync(file,JSON.stringify(value)); assert.throws(() => readPagesProject(file));
  }
});
