# 정적 사이트와 AdSense 도입 실행 계획

> **For agentic workers:** 구현할 때 `superpowers:executing-plans` 또는 `superpowers:subagent-driven-development`를 사용합니다. 아래 체크박스는 실제 구현과 검증을 마친 뒤에만 표시합니다.

**Goal:** Cloudflare 사용을 정적 호스팅으로 제한하면서 무료 주소 배포부터 승인 후 광고 표시와 중단까지 연결합니다.

**Architecture:** GitHub Actions에서 VitePress를 빌드하고 Pages에 Direct Upload합니다. PR 배포와 Pages Functions는 사용하지 않습니다. 기존 AI Worker는 별도 수동 배포와 로컬 검색 대체 경로로 분리합니다.

**Tech Stack:** 기존 JavaScript ESM, Node 22, VitePress 1.6.4, Vue, Node 내장 테스트, GitHub Actions, Wrangler, Cloudflare Pages, AdSense.

**Spec:** [도입 명세](../specs/2026-09-28-static-adsense-minimal-cloudflare-design.md). 정책과 전체 흐름은 이 명세를 기준으로 합니다.

상태: 계획 작성 완료, 아래 구현은 미착수. 이번 PR은 위 명세와 이 계획만 추가합니다. 실제 Google 심사와 광고 표시 확인은 코드 구현 이후의 외부 단계입니다.

## Global Constraints

- Cloudflare 빌드는 0회, PR과 작업 브랜치의 Cloudflare 배포는 0회입니다.
- Pages Functions는 0개입니다. 광고용 신규 Worker와 저장소는 0개입니다.
- 정적 사이트 빌드는 배포할 `main` 커밋당 GitHub Actions에서 1회입니다.
- 설계 문서만 변경하면 문서 검증만 실행합니다. 사이트 빌드, 배포, Worker 호출은 없습니다.
- 기존 AI Worker는 별도 수동 배포로 분리합니다. 실제 AI 호출은 일반 CI에서 하지 않습니다.
- `ADS_MODE=off`, `ADS_CSP_MODE=strict`가 기본값입니다. 보안 완화 승인 전에는 실제 광고를 활성화하지 않습니다.
- 이력서와 목록은 광고 없이 유지합니다. 허용한 상세 문서의 본문 하단 광고는 1개입니다.
- 하나의 작업 브랜치와 하나의 PR을 사용합니다. 목적별 커밋을 나누고 `main`에 직접 푸시하지 않습니다.
- 이 문서 PR 이후 구현을 시작할 때는 같은 변경 범위의 열린 PR을 먼저 확인합니다. 문서 PR이 열려 있으면 그 브랜치를 이어 쓰며, 이미 병합됐다면 구현 변경을 하나의 새 PR로 묶습니다.
- 유료 전환, 실제 ID 추정, 약관 동의, Google 심사 요청, 운영 배포와 보안 완화 승인을 자동 수행하지 않습니다.

## Review Focus

| 위험 입력과 상황 | 기대 동작 | 검증 작업 |
| --- | --- | --- |
| 삭제, 이름 변경, 여러 커밋, diff 조회 실패 | 배포 대상 누락 없이 안전하게 분류하고 필수 검사 결과 반환 | 작업 2 |
| 운영 배포의 별도 주소, 잘못된 ID, 비어 있는 설정 | 비운영 호스트에서 광고 차단. 활성화 필수값 누락 시 빌드 중단 | 작업 1, 4 |
| 광고와 비광고 문서 사이의 SPA 탐색, 뒤로 가기 | 필요한 전체 문서 탐색, 광고 코드 잔존과 슬롯 중복 방지 | 작업 4 |
| 동의 미확인, 철회, CMP 오류, 광고 차단 | 실제 광고 요청 없이 본문과 탐색 유지 | 작업 5 |
| 오래된 Worker 색인, 배포 실패, 광고 긴급 중지 | 최신 로컬 검색 사용, 정적 배포 유지, 재배포 후 중단 검증 | 작업 3, 6 |

## 파일 역할

아래의 새 경로는 구현 예정 경로입니다. 이번 PR에서 이미 생성했다는 뜻이 아닙니다.

| 파일 | 역할 |
| --- | --- |
| `scripts/site-config.mjs` | Origin, base, 광고 모드와 ID 검증 |
| `scripts/ci-changes.mjs` | 변경 파일을 문서, 사이트, Worker 영향으로 분류 |
| `scripts/prepare-public.mjs` | 소개, 개인정보 안내, ads.txt, 공개 설정 산출물 생성 |
| `scripts/deploy-site.mjs` | 정적 전용 산출물 확인 후 Pages 업로드 |
| `site/ads.config.mjs` | 운영자가 승인한 광고 문서 경로 목록 |
| `site/.vitepress/theme/ads-policy.mjs` | 광고 허용과 전체 문서 탐색 여부를 결정하는 순수 함수 |
| `site/.vitepress/theme/consent.mjs` | 실제 CMP의 상태를 광고와 분석 동의로 변환 |
| `site/.vitepress/theme/AdSenseSlot.vue` | 허용된 문서의 광고 슬롯 1개와 로더 수명 관리 |
| `.github/workflows/chat-deploy.yml` | 기존 Worker를 배포하는 수동 전용 워크플로 |
| `wrangler.pages.jsonc` | 정적 Pages 업로드 설정. 기존 `wrangler.jsonc`와 분리 |

기존 `prepare-site.mjs`, `prepare-chat.mjs`, `secure-site.mjs`, `config.mjs`, `theme/index.js`, `DocsChat.vue`, `pages.yml`, `docs-check.yml`, `package.json`, `SECURITY.md`는 담당 작업에서 필요한 범위만 수정합니다.

## 작업 1. 배포 대상 설정과 공개 페이지 준비

**Files:** `scripts/site-config.mjs`, `scripts/prepare-public.mjs`, `site/pages/about.md`, `site/pages/privacy.md`, `site/.vitepress/config.mjs`, `scripts/prepare-site.mjs`, `scripts/prepare-chat.mjs`, `package.json`, `tests/site-config.test.mjs`, `tests/site-output.test.mjs`.

**Interfaces:** `readSiteConfig(env) -> { target, origin, base, adsMode, publisherId, slotId, cspMode }`. `target`은 `github` 또는 `pages`, `adsMode`는 `off`, `verify`, `enabled`, `cspMode`는 `strict`, `static-ads`입니다. `origin`은 경로 없는 HTTPS Origin입니다.

- [ ] 실패 테스트를 추가합니다. 기존 GitHub 기본값은 `/work-history/`, Pages는 `/`입니다. 지원하지 않는 모드와 잘못된 Origin은 거절합니다. `verify`에는 `/^ca-pub-\d{16}$/` 형식의 실제 ID가 필요합니다. `enabled`에는 숫자로 구성된 슬롯 ID와 `static-ads` 정책이 추가로 필요합니다.
- [ ] `node --test tests/site-config.test.mjs`를 실행해 신규 모듈이 없어서 실패하는지 확인합니다.
- [ ] 설정 모듈을 만들고 VitePress와 검색 URL 생성에 같은 base를 적용합니다. 소개와 개인정보 안내를 복사합니다. `site/content`가 삭제된 뒤 공개 파일 생성기를 실행하도록 준비 순서를 고정합니다.
- [ ] `verify`와 `enabled`에서만 소유권 메타 태그와 `ads.txt`를 생성합니다. `ads.txt`의 ID는 `ca-pub-`에서 `ca-`만 제외합니다. canonical, sitemap, robots도 같은 Origin과 base를 사용합니다. 기존 AI 학습 수집 제한은 유지하고 Google 광고 크롤러를 막지 않습니다.
- [ ] 이전 `enabled` 산출물이 남아 있는 상태에서 `off`로 재생성하는 테스트를 추가합니다. 이전 광고 메타 태그, 로더, 슬롯, 게시자 정보가 담긴 `ads.txt`가 남으면 실패합니다. 두 base에서 문서 링크와 검색 결과 경로를 검사합니다.
- [ ] `node --test tests/site-config.test.mjs tests/site-output.test.mjs`를 통과시킵니다. `npm run docs:build`에서 생성 폴더가 재생성돼도 개인정보 안내가 유지되는지 확인합니다.
- [ ] 이 작업의 설정과 생성 변경만 `feat: 정적 사이트 배포 설정과 공개 안내 추가` 커밋으로 묶습니다.

광고 대상은 `site/ads.config.mjs`의 `adPaths` 배열로 관리합니다. 초기 배열은 비어 있습니다. 실제 문서 검토 후에만 채웁니다. 이 목록은 정적 보안 정책과 브라우저의 광고 표시 판단이 함께 사용합니다.

## 작업 2. 정적 배포와 CI 사용량 줄이기

**Files:** `.github/workflows/pages.yml`, `.github/workflows/docs-check.yml`, `scripts/ci-changes.mjs`, `scripts/deploy-site.mjs`, `wrangler.pages.jsonc`, `tests/site-ci.test.mjs`.

**Interfaces:** `classifyChanges(paths) -> { docsCheck, site, worker }`. 경로에는 삭제 전 경로와 이름 변경 전후 경로를 포함합니다. `assertStaticOutput(directory) -> Promise<void>`는 함수 산출물이 있으면 예외를 던집니다.

- [ ] `docs/superpowers/specs/`와 `docs/superpowers/plans/`만 변경한 경우 `site=false`, `worker=false`인 테스트를 추가합니다. `projects/` 수정, 사이트 설정 삭제, 광고 파일 이름 변경, 보안 스크립트 변경은 `site=true`여야 합니다. Worker 코드와 색인 생성기, 색인 원본, 의존성 변경은 `worker=true`로도 표시합니다.
- [ ] `node --test tests/site-ci.test.mjs`가 신규 기능 부재로 실패하는지 확인합니다.
- [ ] PR은 merge-base부터 head까지, push는 before부터 대상 SHA까지 비교합니다. 기준 SHA가 없거나 diff를 확인하지 못하면 문서 전용으로 추정하지 말고 필요한 전체 검증을 실행합니다. 알 수 없는 경로는 사이트 검증 대상에 포함합니다.
- [ ] 필수 PR 검사는 항상 시작하고 내부 조건으로 무거운 단계를 건너뛰게 합니다. 사이트 코드와 설정 변경도 PR 검증에 포함합니다. PR에는 Cloudflare 업로드, Worker 배포, 실제 AI 호출, 배포 Secret 접근을 넣지 않습니다.
- [ ] 정적 배포에서 Worker 배포 단계를 제거합니다. `main`의 사이트 변경과 명시적 수동 실행만 빌드하고 `site/.vitepress/dist`를 업로드합니다. 검증과 배포 때문에 VitePress를 두 번 빌드하지 않습니다. 배포 토큰은 업로드 단계에만 전달합니다.
- [ ] `assertStaticOutput`에서 `functions/`, 파일이나 디렉터리 형태의 `_worker.js`, Worker bindings와 migrations가 포함된 설정을 거절합니다. 작업 루트의 함수 폴더도 확인해 Wrangler가 우연히 함께 배포하지 않게 합니다.
- [ ] PR concurrency는 이전 검사를 취소할 수 있게 하고, 운영 배포는 중간 취소하지 않습니다. 자동 업로드 직전 현재 `main` SHA와 대상 SHA를 대조합니다. 수동 과거 배포 복구는 별도 동작으로 구분합니다.
- [ ] 모의 배포 함수로 검증합니다. 문서 전용 변경과 PR은 업로드 0회, 사이트 변경 `main`은 빌드 1회와 업로드 1회, 잘못된 산출물과 오래된 자동 실행은 업로드 0회여야 합니다. 토큰 문자열이 로그와 산출물에 없는지도 확인합니다.
- [ ] `node --test tests/site-ci.test.mjs`를 통과시키고 `ci: 정적 빌드와 Pages 배포 최소화` 커밋을 만듭니다.

업로드 명령 형태는 다음과 같습니다. 구현 시 고정된 로컬 Wrangler를 사용하고, 실제 프로젝트명과 업로드 디렉터리를 검증한 뒤 실행합니다. 이 문서를 작성하면서 실행하는 명령이 아닙니다.

```bash
./node_modules/.bin/wrangler pages deploy site/.vitepress/dist \
  --config wrangler.pages.jsonc \
  --project-name "$CLOUDFLARE_PAGES_PROJECT" \
  --branch main
```

`CLOUDFLARE_PAGES_API_TOKEN` Secret은 이 단계의 `CLOUDFLARE_API_TOKEN` 환경변수에만 연결합니다. Pages와 기존 Worker 설정의 분리는 실제 잠금 버전의 Wrangler로 검증합니다. [Cloudflare Direct Upload CI 안내](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

## 작업 3. 기존 AI Worker의 필수 배포 의존성 제거

**Files:** `.github/workflows/chat-deploy.yml`, `scripts/deploy-chat.mjs`, `scripts/prepare-chat.mjs`, `worker/index.mjs`, `site/.vitepress/theme/DocsChat.vue`, `tests/chat.test.mjs`, `tests/worker.integration.mjs`.

**Interfaces:** 공개 색인의 안정된 직렬화 바이트에 SHA-256을 계산합니다. `site/content/public/chat-meta.json`과 `worker/generated/meta.json`은 `{ docsDigest }`를 갖습니다. Worker의 `/health` 응답에 `docsDigest`를 추가하고 기존 상태 필드를 유지합니다.

- [ ] 사이트와 Worker의 색인 해시 불일치, health 실패, API 주소 없음에서 `/chat`을 호출하지 않고 로컬 검색을 사용하는 테스트를 추가합니다. 기존 URL 검증, 비용 검증, 요청 한도 테스트도 유지합니다.
- [ ] `npm run docs:prepare && npm test`로 새 기대 동작이 실패하는지 확인합니다.
- [ ] 색인 파일 순서를 안정적으로 정렬하고 해시를 생성합니다. 질문 버튼을 누를 때만 health를 확인해 일치한 경우 AI 요청을 허용합니다. 페이지 진입이나 주기 타이머에서는 Worker를 호출하지 않습니다. 확인 실패는 로컬 검색으로 처리합니다.
- [ ] 기존 배포와 무료 요금제, 비용 확인 로직은 수동 Worker 워크플로에 둡니다. `VITE_CHAT_API_URL`은 등록된 공개 주소를 사용하며, 매번 Worker를 배포해 `GITHUB_ENV`를 채우는 흐름에 의존하지 않습니다.
- [ ] Worker의 허용 Origin에 실제 새 주소만 추가합니다. 기존 GitHub 주소를 임시 유지할지는 전환 상태로 결정합니다. 배포 검증 요청의 Origin과 응답 CORS도 같은 허용 목록을 사용합니다.
- [ ] 실제 API 키 없이 `npm run docs:prepare && npm test && npm run test:worker`를 통과시킵니다. Worker 배포가 실패하거나 생략돼도 정적 빌드가 성공하는지 확인합니다.
- [ ] `refactor: AI 배포와 정적 사이트 배포 분리` 커밋을 만듭니다.

색인 원본이 변경됐다는 CI 결과는 Worker 배포 필요 안내에만 사용합니다. 자동 Worker 배포 트리거로 바꾸지 않습니다. 새 색인이 수동 반영되기 전에는 해시 검사에 따라 최신 로컬 검색을 제공합니다.

## 작업 4. 광고 정책, CSP, 탐색 경계 구현

**Files:** `site/ads.config.mjs`, `site/.vitepress/theme/ads-policy.mjs`, `site/.vitepress/theme/index.js`, `scripts/secure-site.mjs`, `SECURITY.md`, `tests/ads-policy.test.mjs`, `tests/site-output.test.mjs`.

**Interfaces:** `canRequestAds({ mode, origin, expectedOrigin, adEligible, consent, slotId }) -> boolean`. `requiresDocumentNavigation({ fromPath, toPath, enabled, adPaths }) -> boolean`. 경로 판단은 query와 hash를 제외한 동일한 정규화 규칙을 사용합니다.

- [ ] `verify`, 비운영 Origin, 허용 목록 밖 경로, 빈 슬롯, `pending` 또는 `denied` 동의에서 광고 요청이 거짓인 테스트를 추가합니다. 별도 배포 주소와 운영 주소의 문자열 접미사 혼동도 거절해야 합니다.
- [ ] `node --test tests/ads-policy.test.mjs`가 실패하는지 확인한 뒤 순수 판단 함수를 구현합니다. 광고 자격은 실제 존재하는 상세 문서의 명시적 허용 목록으로만 판단합니다.
- [ ] 보안 검토 자료를 작성합니다. 현재 CSP와 제안할 정적 광고 CSP의 지시문 차이, 완화되는 보호, 유지되는 보호, 실제 영향 URL을 `SECURITY.md`와 구현 PR에 기록합니다. 운영자가 승인하기 전에는 `static-ads` 운영 활성화를 중단합니다.
- [ ] 승인한 정책만 `secure-site.mjs`에 구현합니다. 비광고 문서와 `off`, `verify`는 기존 정책을 유지합니다. meta와 HTTP 헤더의 CSP가 겹쳐 광고만 막히거나 비광고 보호가 없어지지 않는지 산출물을 검사합니다. 고정 nonce와 Pages Functions로 우회하지 않습니다.
- [ ] 활성 광고 문서가 출발지 또는 목적지이고 문서 경로가 바뀌면 전체 문서 탐색을 사용합니다. 같은 문서의 hash 이동과 비광고 문서끼리의 이동은 기존 동작을 유지합니다. `router.onBeforeRouteChange`에서 필요한 탐색을 수행하고 SPA 이동을 취소합니다.
- [ ] 광고에서 홈으로 이동, 홈에서 광고 문서로 이동, 광고 문서 간 이동, 뒤로 가기, 직접 접근을 검사합니다. 출발지 CSP가 남아 광고가 차단되거나 광고 코드가 홈에 남아 있으면 실패입니다. 라이브 Google 광고 대신 모의 로더로 먼저 검증합니다.
- [ ] `node --test tests/ads-policy.test.mjs tests/site-output.test.mjs`를 통과시키고, 실제 브라우저의 Network와 Console로 문서 재요청과 정책 적용도 확인합니다. 보안 승인이 없으면 `verify`까지만 완료로 기록합니다.
- [ ] 승인된 범위의 구현을 `feat: 광고 정책과 정적 보안 경계 추가` 커밋으로 묶습니다.

정적 CSP의 구체적 완화 범위는 별도 보안 승인 사항입니다. 해당 승인이 없다는 이유로 전역 CSP 삭제를 구현자가 임의로 선택할 수 없습니다. 광고 표시까지 완료하려면 이 작업의 승인 게이트가 반드시 필요합니다.

## 작업 5. CMP와 광고 슬롯 연결

**Files:** `site/.vitepress/theme/consent.mjs`, `site/.vitepress/theme/AdSenseSlot.vue`, `site/.vitepress/theme/index.js`, `site/.vitepress/theme/style.css`, `site/.vitepress/config.mjs`, `site/pages/privacy.md`, `tests/ads-slot.test.mjs`, `tests/consent.test.mjs`.

**Interfaces:** 동의 상태는 `{ ads: 'pending' | 'granted' | 'denied', analytics: 'pending' | 'granted' | 'denied' }`입니다. `subscribeConsent(listener) -> unsubscribe`로 변경을 전달합니다. 실제 인증 CMP의 문서화된 API에서만 상태를 읽으며 이벤트 이름이나 동의 신호를 추정하지 않습니다.

- [ ] 모의 CMP와 모의 광고 SDK를 사용한 실패 테스트를 추가합니다. 중복 mount에도 로더와 슬롯 초기화는 문서당 각각 1회 이하이며, 동의 미확인, 거부, CMP 오류에는 광고 요청이 0회여야 합니다.
- [ ] `node --test tests/ads-slot.test.mjs tests/consent.test.mjs`로 실패를 확인합니다.
- [ ] 운영자가 선택한 Google 인증 CMP의 독립 초기화 절차와 상태 읽기 API를 확정해 문서에 기록합니다. CMP 초기화까지 광고 동의 뒤로 미루지 않습니다. 선택한 CMP로 이 순서를 보장하지 못하면 `verify`를 유지합니다.
- [ ] 동의 어댑터와 슬롯을 연결합니다. 광고는 허용 문서의 본문 하단에 1개만 두고, 클라이언트 mount 후 실제 너비가 있을 때 초기화합니다. 서버 렌더링에서 `window`, Google SDK, 외부 API를 호출하지 않습니다.
- [ ] Clarity의 광고 저장과 분석 저장 동의를 구분해 전달합니다. 필요한 동의 없이 쿠키를 먼저 기록하지 않는지 확인합니다. 질문 입력과 개인정보 마스킹을 유지합니다.
- [ ] 광고 차단, 빈 광고, SDK 로드 실패, 동의 철회를 처리합니다. 실패 시 본문과 메뉴는 유지하고 자동 재시도나 주기적 광고 갱신은 하지 않습니다. 이미 로드한 광고를 제거해야 할 때 단순 DOM 삭제가 실행된 스크립트를 되돌린다고 가정하지 않습니다.
- [ ] `node --test tests/ads-slot.test.mjs tests/consent.test.mjs`를 통과시키고 모바일과 데스크톱에서 빈 영역, 가로 넘침, 레이아웃 변화를 확인합니다. 실제 광고 클릭은 하지 않습니다.
- [ ] `feat: 동의 기반 AdSense 슬롯 연결` 커밋을 만듭니다.

비광고 문서에는 광고 로더와 슬롯을 넣지 않습니다. 동의 UI를 위해 필요한 코드와 광고 송출 코드의 경계를 실제 네트워크 요청으로 확인합니다. 광고 차단기를 우회하는 코드는 만들지 않습니다.

## 작업 6. 운영 등록, 심사, 수동 활성화와 복구

**Files:** `tests/site-output.test.mjs`, `SECURITY.md`, 이 실행 계획의 체크 상태. 필요하면 명세의 실제 운영 상태만 갱신합니다.

**Interfaces:** 운영자가 실제 Origin, Pages 프로젝트명, 게시자와 슬롯 ID, CMP 설정, Google 승인 상태, CSP 검토 결과를 제공합니다. Secret 원문과 개인 결제 정보는 문서에 기록하지 않습니다.

- [ ] 기준 검증을 실행합니다. `npm run test:docs`, `npm run test:mermaid`, `npm run docs:prepare`, `npm test`, `npm run test:worker`, `npm run docs:build`가 통과해야 합니다. 외부 광고와 AI 응답은 모의 처리합니다.
- [ ] 운영자가 무료 Pages 프로젝트를 Direct Upload로 생성하고 Pages 전용 토큰을 등록합니다. Git 자동 빌드와 PR 미리보기 배포를 사용하지 않는지 확인합니다. `off` 상태의 최초 수동 배포를 승인받아 수행합니다.
- [ ] 무료 운영 주소에서 홈페이지, 상세 문서 직접 접근과 새로고침, CSS와 JS, 검색, Mermaid, 선택적 AI의 로컬 대체 동작을 확인합니다. 기존 GitHub Pages를 바로 삭제하지 않습니다.
- [ ] 운영자가 AdSense에 실제 운영 주소를 추가합니다. `verify`로 배포한 소유권 메타 태그와 `/ads.txt`의 200 응답 및 텍스트 내용을 확인한 뒤, 운영자가 소유권 확인과 심사를 요청합니다.
- [ ] 소개와 개인정보 안내, 허용할 상세 문서, CMP, CSP 승인 결과를 확인합니다. Google의 승인 상태를 직접 확인하기 전에는 `enabled`를 선택하지 않습니다. 거절 시 해당 사유와 보완 작업을 기록하고 재심사합니다.
- [ ] 승인과 검토가 끝나면 실제 슬롯 ID를 등록하고 자동 광고가 꺼져 있는지 확인합니다. `enabled`로 수동 활성화하고 허용 문서 1곳에서 필요한 실제 광고 표시를 확인합니다. 빈 광고 응답은 코드 오류나 승인 실패로 단정하지 않습니다.
- [ ] 비광고 문서, 배포별 별도 주소, 동의 거부, 광고 차단, 오류 화면에서 광고를 요청하지 않는지 확인합니다. 반복 방문과 광고 클릭으로 테스트하지 않습니다.
- [ ] Google 계정 설정과 로컬 모드의 중단 절차를 확인합니다. `enabled` 산출물에서 `verify` 또는 `off`로 재배포해 실제 광고 요청이 중단되는지 검증합니다. 저장소 변수만 바꿔서는 정적 파일이 바뀌지 않음을 운영 안내에 남깁니다.
- [ ] 최초 전환 검증을 마치면 GitHub Pages의 정기 자동 배포는 종료하고 마지막 정상본과 이전 안내를 보존합니다. Pages의 이전 정상 배포를 선택하는 복구 절차를 기록합니다.
- [ ] 최종 보고를 코드 준비, 무료 주소 배포, Google 심사, 광고 표시 확인, 복구 검증으로 나눕니다. 끝나지 않은 외부 단계를 완료로 표시하지 않습니다.

## 구현 시작 전 확인할 값

실제 Pages 프로젝트명과 주소, `ADS_PUBLISHER_ID`, `ADS_SLOT_ID`, 인증 CMP 선택과 설정, 정적 광고 CSP 완화 승인 여부를 확인합니다. 이 값이 아직 없으면 설정과 모의 검증까지 진행하고 운영 광고는 `off` 또는 `verify`로 유지합니다.

현재 문서 PR은 배포 워크플로를 바꾸지 않습니다. 따라서 문서 PR 병합 시에는 기존 `pages.yml`의 Worker 배포와 사이트 배포가 실행될 수 있습니다. 최소 사용 동작은 작업 2와 작업 3을 구현하고 검증한 뒤 적용됩니다.
