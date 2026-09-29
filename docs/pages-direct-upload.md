# Pages Direct Upload 운영 안내

기준일: 2026-09-29

## 운영 주소와 일반 배포

확인한 프로젝트는 `work-history`, 운영 주소는 `https://work-history-4gn.pages.dev`입니다. [공개 주소 파일](../site/pages.project.json)을 사용하므로 `SITE_ORIGIN`, `CLOUDFLARE_PAGES_PROJECT`, `VITE_CHAT_API_URL`을 다시 등록하지 않습니다.

일반 [배포 워크플로](../.github/workflows/pages.yml)의 기본 대상은 Cloudflare Pages입니다. 사이트 입력이 변경된 main 커밋만 검증 후 한 번 빌드해 업로드합니다. 내부 가이드 변경은 문서 검사만 수행합니다. PR에서는 운영 배포하지 않습니다. 같은 변경을 두 호스팅에 동시에 자동 배포하지 않습니다.

기존 GitHub Pages의 마지막 정상본은 그대로 유지합니다. 수동 복구 때만 `문서 사이트 배포`에서 `target=github`를 선택합니다. 로컬 빌드 설정의 기본값은 호환성을 위해 계속 GitHub이며, 운영 워크플로가 최종 빌드에 `SITE_TARGET=pages`를 전달합니다. Repository Variable `SITE_TARGET`을 바꾸어 운영 대상을 전환하는 이전 안내는 더 이상 적용하지 않습니다.

## 배포 토큰

일반 Pages 배포는 실제 최초 업로드에 성공한 Secret 이름 `CLOUDFLARE_API_TOKEN`을 명시적 기본값으로 사용합니다. 다른 Secret을 추가해야만 운영 배포가 되는 상태를 없앴습니다.

전용 토큰으로 분리하려면 해당 계정의 Pages Edit 권한을 가진 토큰을 `CLOUDFLARE_PAGES_API_TOKEN` Secret에 등록하고 Repository Variable `CLOUDFLARE_PAGES_TOKEN_SECRET`을 같은 이름으로 지정합니다. 변수에는 토큰 원문이 아니라 Secret 이름만 넣습니다.

[이름 검증기](../scripts/pages-token.mjs)는 두 이름만 허용합니다. 선택한 Secret이 비어 있으면 중단하며 다른 Secret으로 자동 대체하지 않습니다. 토큰은 최종 업로드 단계에만 전달합니다. 빌드, 테스트, 공개 HTTP 확인에는 전달하지 않습니다. API 키를 로그, 코드, 문서나 채팅에 기록하지 않습니다.

최초 설정 워크플로의 `token_secret` 입력과 일반 배포의 선택 변수는 별개입니다. 현재 기본 운영에는 추가 선택이 필요 없습니다. 기존 토큰을 사용하는 것이 권한이 최소화된 전용 토큰을 발급했다는 뜻은 아닙니다.

## 수동 배포

이미 프로젝트 생성과 최초 업로드를 완료했으므로 `Pages 최초 설정`을 반복하지 않습니다. 사이트만 갱신할 때는 `문서 사이트 배포`에서 다음 값을 사용합니다.

| 입력 | 값 |
| --- | --- |
| 브랜치 | main |
| target | configured 또는 pages |
| confirm_pages | 체크 |

공개 주소를 변경해야 하는 경우 `SITE_ORIGIN`과 `CLOUDFLARE_PAGES_PROJECT`를 함께 명시할 수 있습니다. 저장된 값과 한쪽만 달라지면 중단합니다. AI 허용 Origin과 공개 검증 대상도 함께 검토해야 하므로 다른 주소로 임의 전환하지 않습니다.

## 업로드와 공개 파일 확인

업로드 전에 정적 파일 검사, 실제 프로젝트 조회와 최신 main 검사를 수행합니다. Functions 진입점, 심볼릭 링크, 환경 파일, 런타임 설정이 포함되면 업로드하지 않습니다. 격리된 임시 폴더에서 고정 버전 Wrangler와 검증한 프로젝트명을 사용하고 기존 AI Worker 설정을 섞지 않습니다.

업로드 성공을 step output으로 남기고, 실제 업로드가 있었을 때만 별도 단계에서 [공개 파일 확인](../scripts/verify-public-site.mjs)을 실행합니다. 홈페이지, 소개와 개인정보 안내, 상세 문서 표본, sitemap, robots, 검색 색인과 참조하는 CSS/JS 표본을 실제 HTTPS로 읽어 이번 산출물의 바이트와 비교합니다. verify 모드에는 ads.txt도 확인합니다.

이 검사는 광고나 Clarity 스크립트를 실행하지 않으며 AI에 질문하지 않습니다. 일시적인 전파 지연에는 파일당 GET을 최대 3회 수행합니다. 일치하지 않으면 검사를 실패로 남기고 업로드를 자동 반복하거나 되돌리지 않습니다. 화면 배치, 메뉴 조작과 Clarity의 실제 수집까지 확인한 것으로 간주하지 않습니다.

## 복구

GitHub 복구는 `target=github` 수동 실행으로 최신 main을 기존 주소용으로 다시 빌드하는 방식입니다. 이후 main의 일반 배포 대상은 여전히 Pages입니다. 기본 대상 자체를 되돌리려면 워크플로를 검토한 PR로 변경합니다.

Pages의 이전 정상본 복구는 Cloudflare의 [롤백 기능](https://developers.cloudflare.com/pages/configuration/rollbacks/)으로 별도 수행합니다. 공개 확인 실패만으로 사이트가 롤백됐다고 판단하지 않습니다.

## 최초 설정이 필요한 경우

현재 프로젝트에는 필요하지 않습니다. 새 프로젝트를 준비할 때만 [Pages 최초 설정](../.github/workflows/pages-bootstrap.yml)을 main에서 명시적으로 승인합니다. 프로젝트명과 사용할 Secret 이름을 선택하면 조회부터 시작하고, 확정적인 프로젝트 없음에만 생성합니다. 실제 subdomain에서 주소를 읽으며 이름으로 추정하지 않습니다.

생성 후 조회에는 한정된 재시도만 있고 POST는 반복하지 않습니다. 기존 Git 연동, 다른 브랜치나 런타임 설정은 수정하지 않습니다. 처음 업로드는 off와 strict CSP입니다. 공개 주소와 배포 메타데이터만 산출물에 보존하며 토큰이나 전체 계정 응답은 포함하지 않습니다.

## 광고와 사용량

현재 실제 광고는 활성화하지 않습니다. 게시자 ID가 준비된 후 `ADS_MODE=verify`로 일반 배포하면 소유권 메타 태그와 ads.txt만 생성합니다. Google 심사, 동의 처리와 정적 CSP 검토를 완료하기 전에는 enabled를 허용하지 않습니다. 공개 안내에는 개발 상태를 반복하지 않고 실제 사용하는 정보 처리만 설명합니다.

Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions와 광고용 Worker는 추가하지 않습니다. 기존 AI Worker는 별도 [수동 배포와 연결 확인](chat-connection.md)으로 관리합니다. [진행 체크리스트](progress.md)에서 코드 준비와 실제 실행 결과를 구분합니다.

## 근거

- [Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare 정적 페이지 제공](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [GitHub Actions Secret 사용](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [배포 스크립트](../scripts/deploy-site.mjs), [정적 검사](../scripts/static-output.mjs)
