# Pages Direct Upload 운영 안내

기준일: 2026-09-29

현재 호스팅은 GitHub Pages입니다. Pages 연결 코드와 실제 계정 생성, 최초 배포는 구분합니다. 검증한 상태는 [진행 체크리스트](progress.md)에 기록합니다.

## 처음 연결할 때

프로젝트를 대시보드에서 직접 만들거나 `SITE_ORIGIN`을 먼저 알아낼 필요는 없습니다. GitHub Actions의 `Pages 최초 설정`을 실행하면 프로젝트 조회, 필요한 최초 생성, 실제 주소 확보와 선택한 정적 업로드를 수행합니다.

| 실행 입력 | 선택 |
| --- | --- |
| 브랜치 | `main` |
| `project_name` | 기본값 `work-history`. 생성하거나 재사용할 프로젝트 이름 |
| `token_secret` | 실제 업데이트한 Secret 이름. 기본값 `CLOUDFLARE_PAGES_API_TOKEN`, 기존 토큰을 명시적으로 사용할 때만 `CLOUDFLARE_API_TOKEN` 선택 |
| `confirm` | 생성과 선택한 최초 배포를 승인할 때 체크 |
| `deploy` | 기본값 체크. 해제하면 프로젝트와 주소만 확인하고 사이트는 업로드하지 않음 |

해당 계정의 `CLOUDFLARE_ACCOUNT_ID` Repository Variable과 선택한 Secret이 필요합니다. Pages 권한은 `Account > Cloudflare Pages > Edit`로 제한합니다. 선택한 Secret이 비어 있으면 다른 토큰으로 자동 대체하지 않습니다. 토큰 원문은 채팅, 문서, 코드에 기록하지 않습니다.

기존 토큰 선택은 최초 설정 실행에만 적용됩니다. 일반 배포는 계속 `CLOUDFLARE_PAGES_API_TOKEN`을 사용합니다. Billing 권한, Global API Key, 새 GitHub 관리용 토큰은 추가하지 않습니다.

프로젝트가 있으면 읽기 전용으로 확인합니다. 프로젝트 없음 코드와 HTTP 404가 함께 확인된 경우에만 새 Direct Upload 프로젝트를 생성합니다. 권한 오류, 통신 오류, 사용량 제한은 생성 조건이 아닙니다. 기존 Git 연동, 다른 운영 브랜치, Functions, 런타임 연결 설정은 임의로 바꾸지 않습니다.

생성 후 반환된 실제 `subdomain`을 조회하고 앞에 `https://`를 붙여 `SITE_ORIGIN`으로 사용합니다. 프로젝트 이름으로 주소를 추측하지 않습니다. 미리보기 주소, 경로, 마지막 슬래시는 허용하지 않습니다. 생성 응답이 불확실하면 POST를 재시도하거나 프로젝트를 삭제하지 않습니다. 다시 실행하면 조회부터 시작합니다.

## 최초 업로드와 주소 보존

첫 업로드는 Repository Variable의 광고 상태와 관계없이 `ADS_MODE=off`, strict CSP로 고정합니다. 검증과 빌드는 토큰 없이 실행합니다. 토큰은 프로젝트 확인 단계와 최종 업로드 단계에만 전달합니다. 실제 AI Worker는 이 과정에서 갱신하지 않습니다.

정적 사이트는 1회 빌드합니다. 기존 [배포 스크립트](../scripts/deploy-site.mjs)의 정적 검사와 오래된 배포 방지 검사를 거친 뒤 Pages에만 업로드합니다. 기존 GitHub 사이트와 `SITE_TARGET`은 변경하지 않습니다. 계정 확인과 사이트 업로드 성공, 실제 브라우저 확인은 별개입니다.

실행 결과의 `pages-bootstrap-실행번호` 산출물에는 `pages-project.json`과 `deployment.json`이 들어갑니다. 토큰과 원본 계정 응답은 제외합니다. 산출물은 사이트 빌드 전에 보존하므로 이후 빌드가 실패해도 확보한 주소를 확인할 수 있습니다. 보존 기간은 30일입니다.

`pages-project.json`을 검토한 뒤 `site/pages.project.json`으로 PR에 반영하면 일반 배포도 해당 프로젝트명과 주소를 읽습니다. 이는 공개 설정 파일이며 토큰이나 자동 전환 플래그를 담지 않습니다. 이 파일이 반영된 뒤에는 `CLOUDFLARE_PAGES_PROJECT`와 `SITE_ORIGIN`을 수동 등록할 필요가 없습니다. 실제 실행 전에는 이 파일을 임의의 주소로 만들지 않습니다.

현재 대화 도구에서 workflow_dispatch 시작을 지원하지 않는 경우에는 최초 `Run workflow` 버튼만 운영자가 실행해야 합니다. 실행 결과 조회, 주소 파일 반영과 후속 검증은 결과를 확인한 뒤 진행합니다. 실행되지 않은 설정을 계정 연결 완료로 표시하지 않습니다.

## 일반 배포와 전환

기본 대상은 기존 GitHub Pages입니다. `SITE_TARGET` 미등록 또는 `github`이면 기존 주소를 유지합니다. 공개 주소 파일을 반영하는 것만으로 운영 대상을 바꾸지 않습니다.

기존 방식대로 Repository Variables의 `CLOUDFLARE_PAGES_PROJECT`, `SITE_ORIGIN`을 둘 다 지정할 수도 있습니다. 한 값만 저장된 공개 파일과 다르게 지정하면 혼합 설정으로 판단해 중단합니다. 공개 설정은 빌드 job이 읽어야 하므로 배포 Environment에만 두지 않습니다.

`VITE_CHAT_API_URL`은 별도 등록 없이 기존 Worker 주소를 사용합니다. 새 Pages Origin의 CORS와 문서 버전 호환성을 준비하기 전에는 AI 대신 로컬 문서 검색이 제공될 수 있습니다. AI 제공자 키는 사이트에 넣지 않습니다.

새 주소에서 직접 접근, 새로고침, 소개와 개인정보 안내, 검색, sitemap, robots와 Clarity를 검증합니다. 실제 운영 조건과 광고 개인정보 안내도 점검합니다. 전환 승인이 끝난 뒤에만 `SITE_TARGET=pages`로 바꿉니다. 변수 수정 자체가 배포를 실행하지는 않습니다.

연결이 끝난 뒤에는 `문서 사이트 배포`를 사용합니다. 수동 Pages 배포는 `main`, `target=pages`, `confirm_pages=true`입니다. 운영 상태가 Pages로 설정된 경우에는 사이트 입력이 변경된 main 커밋도 같은 경로를 사용합니다. 정상 운영에서 두 플랫폼에 중복 배포하지 않습니다.

## 사용량과 보안

Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions, 광고용 Worker는 사용하지 않습니다. 최초 설정 워크플로는 수동 실행만 허용합니다. push, PR, 댓글, 주기 실행으로 프로젝트 생성을 시작하지 않습니다. 최초 설정 코드나 가이드만 바뀌면 사이트 빌드와 배포를 생략합니다.

[정적 검사](../scripts/static-output.mjs)는 Functions 진입점, 심볼릭 링크, 환경 파일과 비정적 설정을 거절합니다. 배포 전에 HTML, canonical, sitemap과 광고 모드를 확인합니다. 업로드 시 실제 프로젝트의 이름과 Origin, main 브랜치, Direct Upload 여부를 다시 조회합니다. 일반 배포는 프로젝트를 자동 생성하지 않습니다.

Wrangler 4.133.0의 Pages 명령은 사용자 지정 `--config`를 지원하지 않습니다. [정적 템플릿](../wrangler.pages.jsonc)을 검사한 뒤 격리된 임시 폴더의 `wrangler.json`으로 사용합니다. 기존 AI Worker 설정은 복사하지 않습니다. `--force`는 해당 버전의 새 Workers 배포 자동 전환을 막는 옵션이며 검사와 승인을 우회하지 않습니다.

업로드 직전 최신 main과 조상 관계를 확인합니다. 새 사이트 입력이나 조회 실패가 있으면 오래된 결과물로 덮어쓰지 않습니다. 임시 폴더는 성공과 실패 모두 정리하며 토큰을 다루는 CLI의 원본 출력은 공개 로그에 남기지 않습니다.

## 복구와 광고 심사

최초 Pages 배포에 실패해도 기존 GitHub 사이트는 유지합니다. 프로젝트 생성 뒤 실패했다면 생성된 프로젝트도 삭제하지 않습니다. 원인을 수정한 뒤 같은 이름으로 다시 조회합니다.

전환 후 GitHub로 되돌리려면 `SITE_TARGET=github`로 변경하고 `target=github` 수동 배포를 실행합니다. 최신 main을 GitHub용으로 다시 빌드하는 방식입니다. Pages의 과거 정상 배포 복구는 Cloudflare 롤백 기능으로 별도 수행합니다.

AdSense 등록과 심사는 실제 무료 주소의 운영 확인 뒤 진행합니다. 게시자 ID를 등록하고 `ADS_MODE=verify`로 일반 배포하면 소유권 메타 태그와 `ads.txt`만 생성합니다. 최초 설정 워크플로는 광고 심사용 재배포에 사용하지 않습니다. `enabled`는 동의 처리와 CSP 검토가 끝나기 전까지 차단합니다.

## 근거

- [최초 설정 워크플로](../.github/workflows/pages-bootstrap.yml)
- [프로젝트 최초 설정](../scripts/bootstrap-pages.mjs), [공개 주소 검증](../scripts/pages-project.mjs)
- [일반 배포 워크플로](../.github/workflows/pages.yml), [배포 설정](../scripts/pages-config.mjs)
- [Cloudflare 프로젝트 생성 API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)
- [Cloudflare 프로젝트 조회 API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/get/)
- [Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Wrangler Pages 구현](https://github.com/cloudflare/workers-sdk/blob/wrangler%404.133.0/packages/wrangler/src/pages/deploy.ts)
- [Pages 롤백](https://developers.cloudflare.com/pages/configuration/rollbacks/)
