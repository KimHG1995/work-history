# Pages Direct Upload 운영 안내

기준일: 2026-09-29

이 안내는 [PR #15](https://github.com/KimHG1995/work-history/pull/15)의 구현 기준입니다. 코드 검증과 실제 Cloudflare 계정 연결은 별개입니다. 프로젝트 생성, 전용 토큰 등록, 최초 업로드는 아직 운영 확인을 마치지 않았습니다.

## 배포 원칙

기본 대상은 기존 GitHub Pages입니다. `SITE_TARGET`을 등록하지 않거나 `github`로 두면 기존 주소를 유지합니다. Pages 설정을 미리 등록하는 것만으로 호스팅을 바꾸지 않습니다.

빌드는 GitHub Actions에서 수행합니다. Cloudflare에는 완성된 정적 파일만 Direct Upload합니다. Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions, 광고용 Worker는 사용하지 않습니다. 한 실행에서는 GitHub와 Pages 중 한 곳만 배포합니다. 내부 가이드만 변경한 경우에는 사이트를 빌드하거나 배포하지 않습니다.

## 최초 연결에 필요한 설정

GitHub 저장소의 Settings, Secrets and variables, Actions에서 등록합니다. 공개 설정은 Repository Variables에 둡니다. 빌드 job이 읽어야 하므로 배포 Environment에만 등록하지 않습니다.

| 구분 | 이름 | 값 |
| --- | --- | --- |
| Variable | `CLOUDFLARE_PAGES_PROJECT` | 실제 Direct Upload 프로젝트 이름 |
| Variable | `SITE_ORIGIN` | Cloudflare에 표시된 정확한 운영 HTTPS Origin. 경로와 마지막 슬래시 제외 |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | 해당 프로젝트의 계정 ID. 기존 계정과 같으면 기존 값 유지 |
| Secret | `CLOUDFLARE_PAGES_API_TOKEN` | 해당 계정의 Pages 전용 배포 토큰 |
| Variable | `SITE_TARGET` | 최초 검증까지 미등록 또는 `github` |
| Variable | `ADS_MODE` | 최초 검증은 `off` |

`VITE_CHAT_API_URL`은 추가로 등록하지 않아도 기존 Worker 주소를 사용합니다. AI 제공자 키를 사이트 설정에 넣지 않습니다.

Pages 토큰 권한은 `Account > Cloudflare Pages > Edit`를 해당 계정으로 제한합니다. 이 정적 배포를 위해 Billing 권한이나 Global API Key를 추가하지 않습니다. 기존 Worker 배포용 `CLOUDFLARE_API_TOKEN`과 구분합니다. 토큰 원문은 문서, 채팅, 저장소 파일에 기록하지 않습니다.

프로젝트는 Git 연동이 없는 Direct Upload 방식으로 준비하고 운영 브랜치를 `main`으로 설정합니다. 기존 Git 연동 프로젝트를 자동으로 변경하지 않습니다. 프로젝트명으로 주소를 추측하지 말고 대시보드에서 실제 주소를 확인합니다.

## 첫 배포와 전환

PR이 병합된 뒤 GitHub Actions의 `문서 사이트 배포`를 수동 실행합니다. 브랜치는 `main`, `target`은 `pages`, `confirm_pages`는 `true`를 선택합니다. 광고 설정은 실행 입력이 아니라 Repository Variable `ADS_MODE=off`입니다.

이 실행은 정적 사이트를 1회 빌드하고 Pages에만 업로드합니다. 기존 GitHub Pages는 마지막 정상본을 유지합니다. 업로드 후 홈페이지, 상세 문서 직접 접근과 새로고침, 소개, 개인정보 안내, 검색, sitemap과 robots를 확인합니다. 실제 운영 주소에서만 Clarity가 실행되는지도 확인합니다.

AI는 별도입니다. 새 Origin을 허용하는 CORS와 문서 버전 호환성을 확인하고 기존 Worker를 수동 갱신해야 합니다. 준비되지 않은 경우에는 로컬 문서 검색을 사용합니다. 정적 사이트 배포 성공을 실제 AI 답변 성공으로 표시하지 않습니다.

새 주소 검증과 전환 승인이 끝난 뒤에만 Repository Variable `SITE_TARGET=pages`로 변경합니다. 이후 사이트 입력이 바뀐 main 커밋은 Pages에 배포됩니다. 변수 수정 자체가 새 배포를 만들지는 않으므로 필요하면 수동 실행합니다. 정상 운영에서 두 플랫폼에 계속 중복 배포하지 않습니다.

## 업로드 전 검사

[배포 스크립트](../scripts/deploy-site.mjs)는 메타데이터의 SHA와 배포 대상, HTML과 canonical, sitemap, 광고 모드를 다시 검사합니다. [정적 검사](../scripts/static-output.mjs)는 Functions 진입점, 심볼릭 링크, 환경 파일과 런타임 설정을 거절합니다.

전용 토큰은 최종 업로드 단계에만 전달됩니다. 실제 프로젝트의 이름, Origin, 운영 브랜치, Direct Upload 여부와 런타임 연결 설정을 읽기 전용으로 확인합니다. 프로젝트가 없거나 확인 결과가 맞지 않으면 업로드를 중단하며 새 프로젝트를 자동 생성하지 않습니다.

업로드 직전에 main의 최신 사이트 입력과 조상 관계를 확인합니다. 새 사이트 변경이 있거나 Git 조회에 실패하면 이전 결과물로 덮어쓰지 않습니다. 빌드 이후 내부 문서만 바뀐 경우에는 기존 결과물을 사용할 수 있습니다.

## Wrangler 설정 분리

잠금 버전 Wrangler 4.133.0의 Pages 명령은 사용자 지정 `--config` 경로를 지원하지 않습니다. 최초 계획의 명령을 그대로 실행하지 않습니다.

저장소의 [정적 템플릿](../wrangler.pages.jsonc)을 검증한 뒤 임시 업로드 폴더에 표준 이름 `wrangler.json`으로 생성합니다. 기존 AI Worker의 `wrangler.jsonc`는 이 폴더에 복사하지 않습니다. 해당 버전의 `--force`는 새 Workers 배포로 자동 전환하지 않고 Pages를 사용하도록 지정하는 옵션입니다. 저장소 검사나 배포 승인을 건너뛰는 옵션으로 사용하지 않습니다.

성공과 실패 모두 임시 폴더를 정리합니다. 토큰을 다루는 CLI의 원본 출력은 공개 로그에 남기지 않습니다. 업로드 job은 사이트를 다시 빌드하지 않습니다.

## 실패 시 복구와 광고 심사

최초 Pages 배포에 실패해도 기존 GitHub Pages를 삭제하지 않습니다. 프로젝트, Origin, 권한, 정적 검사 오류를 확인하고 재실행합니다. Cloudflare 업로드 완료와 실제 운영 화면 확인은 구분합니다.

전환 후 GitHub로 되돌릴 때는 `SITE_TARGET=github`로 바꾸고 수동 실행의 `target=github`를 선택합니다. 이는 최신 main으로 GitHub용 사이트를 다시 빌드하는 방식이며 과거 커밋 강제 배포가 아닙니다. Pages의 이전 정상 배포 복구는 Cloudflare의 롤백 절차에 따라 별도로 수행합니다.

AdSense 심사는 무료 주소의 운영 확인 뒤 진행합니다. 실제 게시자 ID를 등록하고 `ADS_MODE=verify`로 재배포하면 소유권 메타 태그와 `ads.txt`만 생성합니다. 광고 로더와 슬롯은 아직 생성하지 않습니다. `enabled`는 동의 처리와 CSP 검토가 끝나기 전까지 차단합니다.

## 근거

- [배포 워크플로](../.github/workflows/pages.yml)
- [배포 설정 검증](../scripts/pages-config.mjs)
- [Cloudflare Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Direct Upload 프로젝트](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Wrangler 4.133.0 Pages 구현](https://github.com/cloudflare/workers-sdk/blob/wrangler%404.133.0/packages/wrangler/src/pages/deploy.ts)
- [Pages 롤백](https://developers.cloudflare.com/pages/configuration/rollbacks/)
