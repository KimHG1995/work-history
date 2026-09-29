import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectDeployment, validSha, validateDeployment } from './pages-config.mjs';
import { identityFromProject, validProjectName, validatePagesProject } from './pages-project.mjs';

function isLatestMain(env) {
  try {
    execFileSync('git', ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { stdio: 'pipe', timeout: 30000 });
    return execFileSync('git', ['rev-parse', 'refs/remotes/origin/main'], { encoding: 'utf8' }).trim() === env.GITHUB_SHA;
  } catch { throw new Error('Could not verify current main; no Cloudflare request was made.'); }
}

/** Only a confirmed, manual main run can create a project. No implicit token fallback. */
export async function bootstrapPages({ env = process.env, fetchImpl = fetch, current = isLatestMain } = {}) {
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main' ||
      env.PAGES_BOOTSTRAP_CONFIRMED !== 'true' || !validSha(env.GITHUB_SHA)) throw new Error('Confirm a manual setup on main first.');
  const tokenSource = env.BOOTSTRAP_TOKEN_SECRET || 'CLOUDFLARE_PAGES_API_TOKEN';
  if (!['CLOUDFLARE_PAGES_API_TOKEN', 'CLOUDFLARE_API_TOKEN'].includes(tokenSource)) throw new Error('Unsupported setup token selection');
  const name = env.PAGES_BOOTSTRAP_PROJECT || 'work-history';
  if (!validProjectName(name)) throw new Error('Invalid Pages project name');
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_PAGES_API_TOKEN;
  if (typeof account !== 'string' || account.length !== 32 || !/^[a-f0-9]{32}$/i.test(account)) throw new Error('Invalid CLOUDFLARE_ACCOUNT_ID');
  if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) throw new Error(`Missing selected Secret: ${tokenSource}`);
  if (!await current(env)) throw new Error('Setup commit is no longer current main; start a new manual run.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`;
  async function request(url, method = 'GET', allowMissing = false) {
    let response;
    try {
      response = await fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ name, production_branch: 'main' }) } : {}) });
    } catch {
      throw new Error(method === 'POST' ? 'Project creation result is uncertain. No retry was made; a new manual run will look up the project first.' : 'Pages project lookup failed; no creation was attempted.');
    }
    let body;
    try { body = await response.json(); } catch { throw new Error('Invalid Cloudflare JSON response; raw response withheld.'); }
    const codes = Array.isArray(body?.errors) ? body.errors.map(error => error?.code) : [];
    if (allowMissing && response.status === 404 && body?.success === false && codes.length > 0 && codes.every(code => code === 8000007)) return null;
    if (!response.ok || body?.success !== true) {
      const safeCodes = codes.filter(Number.isInteger).slice(0, 5).join(',') || 'none';
      throw new Error(`Pages ${method} failed (HTTP ${response.status}, codes ${safeCodes}); no automatic retry or other project changes.`);
    }
    if (!body.result || typeof body.result !== 'object' || Array.isArray(body.result)) throw new Error('Cloudflare returned no project record');
    return body.result;
  }
  let value = await request(`${base}/${name}`, 'GET', true);
  const created = value === null;
  if (created) {
    await request(base, 'POST');
    // A successful create may precede subdomain assignment. Read once; on failure
    // leave the project intact so a later run can safely reuse it.
    value = await request(`${base}/${name}`);
  }
  const project = identityFromProject(value, name);
  const deployment = selectDeployment({
    GITHUB_SHA: env.GITHUB_SHA, GITHUB_EVENT_NAME: 'workflow_dispatch', PAGES_DEPLOY_CONFIRMED: 'true',
    SITE_TARGET: 'pages', SITE_ORIGIN: project.origin, CLOUDFLARE_PAGES_PROJECT: project.projectName,
    ADS_MODE: 'off', ADS_CSP_MODE: 'strict', VITE_CHAT_API_URL: env.VITE_CHAT_API_URL
  });
  return { created, project, deployment };
}

export async function saveBootstrapResult(directory, result) {
  const project = validatePagesProject(result.project);
  const deployment = validateDeployment(result.deployment, result.deployment.sha);
  if (deployment.projectName !== project.projectName || deployment.siteEnv.SITE_ORIGIN !== project.origin ||
      deployment.siteEnv.ADS_MODE !== 'off') throw new Error('Inconsistent bootstrap result');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'pages-project.json'), JSON.stringify(project, null, 2) + '\n');
  await writeFile(path.join(directory, 'deployment.json'), JSON.stringify(deployment, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (!process.argv[2] || !process.env.GITHUB_OUTPUT) throw new Error('Missing setup output paths');
    const result = await bootstrapPages();
    await saveBootstrapResult(process.argv[2], result);
    await appendFile(process.env.GITHUB_OUTPUT, `origin=${result.project.origin}\nproject_name=${result.project.projectName}\nchat_api=${result.deployment.siteEnv.VITE_CHAT_API_URL}\n`);
    const text = `Pages project ${result.created ? 'created' : 'reused'}: ${result.project.projectName}\nSITE_ORIGIN=${result.project.origin}\n`;
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `## Pages 최초 설정\n\n${text}\n공개 주소 파일은 pages-project.json 산출물에 보존했습니다. 프로젝트 확인과 사이트 업로드 성공은 별개입니다. 기존 GitHub 운영 대상은 변경하지 않았습니다.\n`);
  } catch (error) {
    let message = String(error?.message || 'Pages setup failed');
    for (const secret of [process.env.CLOUDFLARE_PAGES_API_TOKEN, process.env.CLOUDFLARE_API_TOKEN].filter(Boolean)) message = message.split(secret).join('[redacted]');
    console.error(message.slice(0, 1000));
    process.exitCode = 1;
  }
}
