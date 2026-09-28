# 기존 AI Worker 연결

작성일: 2026-09-28

## 기본 동작

`VITE_CHAT_API_URL`을 따로 등록하지 않아도 기존 Worker 주소를 사용합니다. 기본 주소는 `site/chat.config.mjs` 한 곳에 둡니다. 이 문서는 [CI 분리 정책](ci-cd-policy.md)의 API 주소를 직접 등록해야 한다는 이전 안내를 대체합니다.

실제 기본 주소는 다음과 같습니다.

```text
https://work-history-chat.kim-h-g199510.workers.dev
```

이 주소는 [2026-09-22 성공 배포 기록](https://github.com/KimHG1995/work-history/actions/runs/35672720750/job/106572571702)에서 확인했습니다. 새 주소를 추정하거나 새 Worker를 만드는 것이 아닙니다. 당시 기록의 비용 검증 성공은 현재 AI 제공자의 응답 상태를 보장하지 않습니다.

주소는 브라우저에 공개되는 설정이며 API 키가 아닙니다. `ORCAROUTER_API_KEY`는 계속 기존 Worker Secret에만 보관합니다.

## 설정 해석

| 입력 | 사용할 값 |
| --- | --- |
| 환경변수 없음, 빈 문자열, 공백 | 저장소의 기존 Worker 기본 주소 |
| 올바른 Worker HTTPS Origin | 명시한 주소로 교체 |
| `off` | AI를 명시적으로 끄고 로컬 검색만 사용 |
| 잘못된 URL 또는 `off` 이외의 값 | 빌드 실패. 임의 주소나 조용한 AI 비활성화로 대체하지 않음 |

환경변수는 GitHub Actions에서 전달한 값 또는 명령 실행 환경의 값을 사용합니다. `.env` 파일만 따로 바꿔 프론트와 CSP가 서로 다른 주소를 사용하게 하지 않습니다. 평소에는 환경변수를 만들지 않습니다. 주소를 의도적으로 바꾸거나 AI를 끌 때만 사용합니다.

VitePress 설정에서 해결한 주소를 `import.meta.env.VITE_CHAT_API_URL`의 빌드 상수로 주입합니다. CSP 생성기도 같은 함수로 해결한 Origin만 `connect-src`에 추가합니다. 주소를 브라우저에만 추가하고 CSP에서 차단하는 상태를 방지합니다. 다른 CSP 지시문은 완화하지 않습니다.

[구현 설정](../site/chat.config.mjs), [VitePress 설정](../site/.vitepress/config.mjs), [CSP 생성기](../scripts/secure-site.mjs)를 함께 확인합니다. Vite 설정 주입은 [VitePress vite 옵션](https://vitepress.dev/reference/site-config#vite)과 [Vite define 옵션](https://vite.dev/config/shared-options#define)을 사용합니다.

## 배포와 API 호출 분리

일반 문서 검사와 정적 빌드에서 Cloudflare 계정 조회, Worker 재배포, 실제 AI 요청을 하지 않습니다. 주소를 알아내려고 매번 과거 배포 로그를 읽지도 않습니다. 기존 성공 배포에서 확인한 공개 주소를 코드로 보존합니다.

방문자가 질문을 보낼 때만 기존 `/health` 확인과 `/chat` 호출을 수행합니다. 문서 버전이 맞지 않거나 연결에 실패하면 로컬 문서 검색을 유지합니다. 이번 수정은 이 보호 장치를 제거하거나 구버전 Worker를 무조건 허용하지 않습니다.

PR #12에서 문서 버전 검사를 추가했으므로 구버전 Worker에는 최초 한 번 최신 코드를 배포해야 합니다. GitHub Actions의 `AI Worker 수동 배포`를 `main`에서 실행하고 `confirm=true`, `live_verify=false`로 진행하면 실제 모델 요청 없이 Worker 코드와 상태를 확인합니다. 환경변수 등록과는 다른 단계입니다.

이후 사이트와 문서 색인이 달라지면 AI가 최신 문서로 답하도록 필요한 시점에만 Worker를 수동 갱신합니다. 가이드 수정은 Worker를 배포하지 않습니다. Worker를 수동 배포할 때마다 사이트 주소 변수를 다시 등록할 필요도 없습니다.

이 수정 PR이 병합되면 사이트 설정 변경으로 정적 사이트가 한 번 배포됩니다. Worker가 이미 최신 문서 버전을 지원하면 그 주소로 호출하며, 그렇지 않으면 Worker 갱신 전까지 로컬 검색을 제공합니다. 코드 검증, 사이트 배포, Worker 갱신, 실제 AI 답변 확인을 서로 다른 완료 상태로 기록합니다.

## 회귀 검증

`tests/chat-config.test.mjs`는 환경변수가 없거나 비어 있어도 클라이언트 빌드 상수와 CSP에 같은 주소가 들어가는지 확인합니다. 선택적 주소 변경, 명시적 비활성화, 잘못된 URL 거절, Secret 미노출도 검사합니다. 테스트는 임시 폴더에서 실제 설정과 CSP 생성기를 실행하며 운영 API는 호출하지 않습니다.
