# 변경 범위별 검증과 배포

작성일: 2026-09-28

이 문서는 PR #12에 추가한 CI 분리 구현의 기준입니다. 병합과 운영 배포는 별도입니다. 기존 [도입 명세](superpowers/specs/2026-09-28-static-adsense-minimal-cloudflare-design.md)와 [실행 계획](superpowers/plans/2026-09-28-static-adsense-minimal-cloudflare.md)은 최초 문서 단계의 전체 광고 도입 계획입니다. 두 문서의 문서 전용 PR, 전체 미착수 표시는 그 당시 상태입니다. 후속 CI 구현 범위와 변경된 결정은 이 문서를 우선하며, 실행 결과는 PR의 검증 기록에서 확인합니다.

## 이번 구현과 남은 범위

변경 영향 분류, 필요한 검사 선택, 정적 사이트 배포 조건, AI Worker 수동 배포 분리, 오래된 AI 색인 보호를 먼저 구현합니다. 기존 GitHub Pages 호스팅은 유지합니다. 무료 Pages 주소 생성, Cloudflare Direct Upload 전환, AdSense와 CMP, CSP 변경은 아직 적용하지 않습니다.

Cloudflare를 새로 구성하거나 운영 API를 호출하지 않아도 코드와 워크플로를 검증할 수 있어야 합니다. 앱과 잠금 파일의 의존성 버전은 이번 변경에서 수정하지 않습니다.

## 실행 기준

| 변경 | 검증 | 정적 사이트 배포 | AI Worker 배포 |
| --- | --- | --- | --- |
| `AGENTS.md`, `README.md`, 작성 가이드, `docs/**`, 템플릿 | 문서 규칙과 상대 링크. 변경 문서에 Mermaid가 있으면 문법 검사 추가 | 없음 | 없음 |
| `experience.md`, `timeline.md`, `projects/**` | 문서, 검색 테스트, 정적 빌드 | `main`에서만 수행 | 자동 실행 없음. 수동 갱신 필요 안내 |
| `site/**`, 정적 보안 코드 | 단위 테스트와 정적 빌드 | `main`에서만 수행 | 없음 |
| `worker/index.mjs`, 요청 한도와 비용 처리, `wrangler.jsonc` | 단위 테스트와 모의 Worker 통합 테스트 | 없음 | 승인한 수동 실행만 |
| `worker/search.mjs`, `worker/docs-version.mjs`, 문서 생성기 | 사이트와 Worker 양쪽 검증 | `main`에서만 수행 | 승인한 수동 실행만 |
| 테스트 파일 | 단위 테스트. `.integration.mjs` 변경이면 Worker 통합 테스트 추가 | 없음 | 없음 |
| 의존성과 알 수 없는 새 입력 | 누락 방지를 위해 전체 검증과 빌드 | `main`에서 수행 | 자동 실행 없음 |
| CI 분류와 검사 실행기 | 전체 검증과 검증용 빌드 | 없음 | 없음 |
| `.github/workflows/pages.yml` | 배포 입력과 설정으로 취급해 전체 검증 | `main`에서 수행 | 없음 |

위의 `worker` 영향 표시는 서버 재배포가 필요할 수 있다는 뜻입니다. CI가 해당 표시만 보고 서버를 배포하지 않습니다.

GitHub 도메인 루트의 `robots.txt` 사본은 별도 저장소에서 게시하므로 이 사이트 배포를 유발하지 않습니다. 루트 저장소나 DNS를 이 작업에서 자동으로 수정하지 않습니다.

## 가이드 수정에 수행하지 않는 일

Mermaid가 없는 내부 가이드만 변경하면 `node scripts/validate-docs.mjs`만 실행합니다. 앱 의존성 설치, 문서 사이트 생성, 전체 단위 테스트, VitePress 빌드, Worker 빌드와 배포, 실제 AI 호출은 하지 않습니다.

변경한 가이드에 Mermaid가 있으면 기존 파서로 문법 검증을 수행합니다. 현재 파서는 기존 개발 의존성을 사용하므로 이 경우에는 `npm ci`가 필요하지만, 사이트 빌드와 배포, AI 호출은 계속 생략합니다. Mermaid 의존성을 별도 프로젝트로 분리하는 작업은 이번 범위에 넣지 않습니다.

워크플로 시작 기록 자체가 없어지는 것은 아닙니다. 가벼운 변경 분류와 필요한 문서 검사는 남습니다. 필수 검사 `문서 검증 / validate`는 모든 PR에서 결과를 반환하고, 실패한 검사를 성공한 생략으로 바꾸지 않습니다.

## 코드 구조

- `scripts/ci-changes.mjs`: Git diff와 실제 빌드 입력으로 검증, 사이트, Worker 영향을 분류합니다.
- `scripts/run-ci.mjs`: 고정된 검사 명령만 선택합니다. 실패하면 이후 명령을 실행하지 않습니다.
- `scripts/check-deploy.mjs`: 배포 큐 안에서 최신 `main`의 사이트 입력과 비교합니다.
- `.github/workflows/docs-check.yml`: PR과 merge queue의 검증입니다. 배포 단계와 외부 서비스 Secret이 없습니다.
- `.github/workflows/pages.yml`: 관련 `main` 변경 또는 수동 실행의 정적 빌드와 GitHub Pages 배포입니다.
- `.github/workflows/chat-deploy.yml`: 기존 AI Worker만 별도로 배포하는 수동 워크플로입니다.

공개 문서도 Markdown이므로 `*.md` 전체를 제외하지 않습니다. Worker 폴더에 있는 코드도 브라우저에서 import하면 사이트의 입력입니다.

## 변경 누락과 배포 순서 보호

PR은 merge-base부터 head까지의 three-dot diff를 사용합니다. Push는 `before`부터 `after`까지 비교해 한 번의 push에 포함된 여러 커밋을 모두 확인합니다. GitHub 파일 목록 API의 일부 페이지만 사용하지 않습니다.

Git diff는 NUL 구분자를 사용합니다. 삭제와 이름 변경 전후 경로, 한국어와 공백이 있는 파일 이름을 보존합니다. 기준 커밋이나 diff를 확인하지 못하면 가이드 변경으로 추측하지 않고 전체 검증으로 전환합니다.

PR 검사는 새 실행으로 이전 실행을 취소할 수 있습니다. 운영 배포는 중간 취소하지 않습니다. 정적 배포 concurrency는 워크플로 전체가 아니라 실제 배포 job에 둡니다. 가이드만 수정한 실행은 배포 큐에 들어가지 않습니다.

배포 직전에 최신 `main`과 빌드한 커밋의 차이를 다시 확인합니다. 최신 커밋이 내부 문서만 바꿨으면 앞서 빌드한 사이트는 배포할 수 있습니다. 최신 커밋에 새 사이트 입력이 있으면 오래된 산출물은 배포하지 않습니다. Git 조회 실패는 배포 허용으로 처리하지 않습니다.

예를 들어 코드 변경 A를 빌드하는 동안 가이드 변경 B가 병합돼도 A의 배포가 무조건 취소되지 않습니다. 단순히 SHA가 다르다는 이유로 A를 버리고 B는 문서 변경이라 배포하지 않는 누락을 방지합니다. 이는 최초 계획의 SHA 단순 동등 비교를 보완한 결정입니다.

배포 실패 뒤에는 해당 실행을 재실행하거나 `문서 사이트 배포`를 `main`에서 수동 실행합니다. 문서만 수정한 다음 커밋이 실패한 사이트 배포를 대신 재시도한다고 가정하지 않습니다. 계정 변수만 바꾼 경우에도 이미 배포한 정적 파일은 바뀌지 않으므로 수동 사이트 배포가 필요합니다.

## 기존 AI 기능의 분리

정적 빌드는 Cloudflare 토큰이나 AI 키를 필요로 하지 않습니다. Worker 배포 결과를 기다려 API 주소를 가져오는 단계도 제거합니다. Repository Variable `VITE_CHAT_API_URL`에는 이미 사용하는 공개 Worker API의 HTTPS Origin을 등록합니다. 이 값은 Secret이 아닙니다.

API 주소가 비어 있으면 로컬 검색만 제공합니다. 주소가 있어도 구버전 Worker, 문서 버전 불일치, health 오류나 시간 초과에서는 실제 AI 요청을 하지 않고 최신 로컬 문서 링크를 제공합니다.

브라우저와 Worker는 `worker/docs-version.mjs`의 같은 SHA-256 함수로 공개 문서 색인을 확인합니다. 브라우저는 실제로 받은 색인을 해시하고, Worker는 배포한 색인을 해시합니다. 별도의 공개 meta 파일과 요청은 추가하지 않습니다. 이는 원래 계획의 meta JSON 파일 대신 같은 검증 목적을 더 적은 파일과 요청으로 구현한 것입니다.

health 확인은 사용자가 질문을 제출할 때만 수행합니다. 페이지 진입이나 정기 타이머로 확인하지 않습니다. health 제한 시간은 5초이며, AI 요청은 기존 전체 제한 시간 안에서 실행합니다.

health 응답 이후 Worker가 다시 배포되는 경우도 처리합니다. 브라우저가 `/chat` 본문에 `docsDigest`를 보내고, Worker는 모델 호출 전에 다시 비교합니다. 불일치하면 `409 / docs_outdated`를 반환합니다. 기존 배포 검증 도구와 클라이언트를 위해 버전 필드가 없는 요청은 기존 검증과 한도 아래에서 처리합니다. 이 버전 검사는 인증 수단이 아닙니다.

이 변경을 병합한 뒤 AI를 계속 제공하려면 실제 API 변수 등록과 새 Worker 수동 배포가 필요합니다. 기존 Worker가 버전 필드를 제공하지 않거나 변수가 없으면 안전하게 로컬 검색만 제공됩니다. 이것을 AI 정상 연동 완료로 표시하지 않습니다.

## Worker 수동 배포

GitHub Actions에서 `AI Worker 수동 배포`를 선택하고 `main` 브랜치에서 실행합니다. `confirm`을 선택해야 실제 배포 단계가 수행됩니다.

`live_verify`의 기본값은 `false`입니다. Worker 코드 배포와 상태 확인은 하되 실제 AI 요청은 하지 않습니다. 실제 무료 AI 요청 1회까지 검증하려면 운영자가 이 옵션을 별도로 선택해야 합니다. 반복 호출이나 유료 대체 요청은 하지 않습니다.

기존 Cloudflare 무료 요금제 확인과 Secret 처리, USD 0 비용 검증 정책은 유지합니다. 배포 Secret은 실제 배포 step에만 전달하며, PR과 일반 사이트 빌드에는 전달하지 않습니다.

Worker 배포 후 실행 요약에 공개 API 주소와 변수 등록 안내가 표시됩니다. 이후 사이트를 다시 배포하면 해당 주소가 반영됩니다. 변수 등록과 실제 운영 배포를 이번 PR 작성 과정에서 대신 수행하지 않습니다.

## 검증 범위

추가 테스트는 가이드, 공개 문서, Worker 전용과 공통 코드, 테스트 전용 변경을 구분합니다. 다중 커밋, merge-base, 삭제와 이름 변경, 351개 파일, 잘못된 SHA, 실패한 diff, 내부 Mermaid, 검사 실패 중단, 오래된 배포 차단도 검사합니다.

광고나 AI 서비스에 실제 요청을 보내지 않습니다. Worker 통합 테스트의 외부 응답은 Miniflare의 모의 응답입니다. 코드 구현 검증과 운영 배포, 실제 AI 동작 확인은 구분해 보고합니다.

## 참고

[GitHub Actions workflow 문법](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)은 조건부 실행과 권한 설정의 기준입니다. [필수 검사와 생략 처리](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)를 따라 필수 PR 검사를 경로 필터로 통째로 생략하지 않습니다.
