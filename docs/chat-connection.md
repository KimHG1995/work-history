# 기존 AI Worker 연결

기준일: 2026-09-29

## 기본 동작

`VITE_CHAT_API_URL`은 따로 등록하지 않아도 됩니다. [공개 설정](../site/chat.config.mjs)의 기존 주소를 사용하며 API 키는 기존 Worker Secret에만 보관합니다.

```text
https://work-history-chat.kim-h-g199510.workers.dev
```

| 설정값 | 동작 |
| --- | --- |
| 미등록, 빈 문자열, 공백 | 기존 Worker 주소 사용 |
| 올바른 Worker HTTPS Origin | 명시한 주소로 교체 |
| `off` | AI를 끄고 로컬 문서 검색만 사용 |
| 그 외 | 설정 오류로 중단 |

브라우저 호출과 CSP의 허용 주소는 같은 설정을 사용합니다. 일반 문서 검사와 사이트 빌드에서 주소 조회나 Worker 배포를 하지 않습니다.

## 배포와 연결 확인

두 워크플로를 구분합니다. [이전 CI 안내](ci-cd-policy.md)와 다르면 이 문서와 실제 워크플로를 기준으로 합니다.

| 목적 | 워크플로와 입력 | 실행 범위 |
| --- | --- | --- |
| Worker 코드 또는 번들 문서 갱신 | `AI Worker 수동 배포`, main, confirm 체크 | 테스트, 무료 계정 사전 확인, 기존 Worker 배포, 두 사이트의 health와 문서 버전 확인 |
| 배포 없이 연결 상태 확인 | `AI 연결 확인 (배포 없음)`, main, confirm 체크 | 두 Origin의 health, release와 문서 해시, Pages OPTIONS 확인 |
| 실제 무료 답변 1회 확인 | 같은 연결 확인 화면에서 live_verify 추가 체크 | 연결 확인 후 `/chat` 1회. 유료 대체나 자동 재시도 없음 |

Worker 배포 과정은 실제 모델을 호출하지 않습니다. 독립 연결 확인은 Cloudflare 토큰이나 OrcaRouter 키를 받지 않으며 의존성 설치와 사이트 빌드, 배포도 하지 않습니다. 실제 AI 요청이 실패하면 연결 확인 실행은 실패로 남기지만 이미 성공한 Worker 배포를 실패로 바꾸거나 다시 실행하지 않습니다.

[Worker 배포 워크플로](../.github/workflows/chat-deploy.yml), [독립 연결 확인](../.github/workflows/chat-verify.yml), [검증 코드](../scripts/verify-chat.mjs).

## 사이트별 문서와 제한

[허용 목록](../worker/public-sites.mjs)에 있는 GitHub Origin과 확인된 Pages Origin만 허용합니다. 임의의 하위 도메인이나 미리보기 주소를 추가하지 않습니다.

사이트별 `/work-history/`와 `/` 경로를 반영해 공개 문서 해시와 출처 링크를 맞춥니다. 같은 Worker와 `global-v1`을 사용하므로 사이트를 바꿔도 요청 한도가 별도로 생기지 않습니다.

브라우저는 사용자가 질문할 때 문서 버전을 확인합니다. 버전 불일치와 연결 실패에는 최신 로컬 문서 검색을 제공합니다. 공개 문서를 바꾼 경우 필요한 시점에만 Worker를 갱신하고, 내부 가이드만 바꾼 경우에는 갱신하지 않습니다.

## 확인한 운영 결과

[실행 36514274673](https://github.com/KimHG1995/work-history/actions/runs/36514274673/job/109232982902)에서 기존 Worker 배포와 두 Origin의 health, release, CORS, 문서 버전 검증은 통과했습니다. 마지막 무료 실호출만 `429 / err_free_access_denied`로 실패했습니다. 사용자는 이후 챗봇 답변이 정상이라고 확인했습니다. 이를 해당 자동 검증 실행의 성공으로 바꾸지는 않습니다.

현재 Worker는 모든 429에 재시도 안내를 반환하며 필요하면 기본값 60초를 사용합니다. 60초 뒤에 공급자 접근이 복구된다고 단정하지 않습니다. 세부 오류 안내 개선은 별도 항목이며, 무료 접근 조건을 우회하거나 유료 모델로 전환하지 않습니다.

새 워크플로의 성공 여부는 실제 실행 후 [진행 상태](progress.md)에 구분해서 기록합니다. 이번 연결 확인 분리만으로 Worker를 다시 배포할 필요는 없습니다.
