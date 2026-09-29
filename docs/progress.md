# 정적 사이트와 광고 도입 진행 상태

기준일: 2026-09-29

구현, 자동 검사, PR 병합, 실제 계정 작업과 운영 확인을 구분합니다. [최초 실행 계획](superpowers/plans/2026-09-28-static-adsense-minimal-cloudflare.md)의 미착수 표시는 최초 설계 시점의 기록입니다. 확인하지 않은 계정 상태는 체크하지 않습니다.

## CI 분리와 기존 AI 주소 복구

- [x] 내부 가이드, 공개 콘텐츠, 사이트 코드와 Worker 코드의 변경 영향을 분류했습니다.
- [x] 내부 가이드만 변경하면 문서 검사만 실행합니다. Mermaid가 없으면 npm 설치도 하지 않습니다.
- [x] PR은 검증만 수행하고 사이트와 Worker를 배포하지 않습니다.
- [x] Worker 배포와 실제 AI 검증을 승인한 수동 실행으로 분리했습니다.
- [x] 문서 버전 불일치와 연결 실패에서 로컬 검색을 제공하도록 구현하고 모의 검사했습니다.
- [x] PR #12를 병합하고 GitHub Pages 배포 성공을 확인했습니다. 병합 커밋은 `a3ae171`입니다.
- [x] 별도 `VITE_CHAT_API_URL` 등록 없이 기존 Worker 주소를 사용합니다. 클라이언트와 CSP가 같은 설정을 사용합니다.
- [x] PR #13 병합과 GitHub Pages 배포를 확인했습니다. 병합 커밋은 `cdb6a01`입니다.
- [ ] 기존 Worker를 문서 버전 응답이 있는 코드로 갱신하고 운영 health를 확인합니다.
- [ ] 운영 페이지에서 실제 AI 답변 복구를 확인합니다. 주소 복구만으로 완료 처리하지 않습니다.

근거: [PR #12](https://github.com/KimHG1995/work-history/pull/12), [PR #13](https://github.com/KimHG1995/work-history/pull/13), [PR #13 배포](https://github.com/KimHG1995/work-history/actions/runs/36379848587).

## 사이트 설정과 AdSense 심사 준비

- [x] 대상별 Origin과 base를 검증하고 검색 링크, canonical과 sitemap에 같은 설정을 적용합니다.
- [x] Clarity는 정확한 운영 Origin에서만 실행합니다.
- [x] 소개와 개인정보 안내를 원본에서 생성합니다. AI 색인에는 넣지 않습니다.
- [x] `off`와 `verify`를 분리했습니다. `verify`는 게시자 ID의 메타 태그와 `ads.txt`만 생성합니다.
- [x] `off`로 되돌리면 이전 광고 확인 파일과 게시자 정보가 남지 않도록 검사합니다.
- [x] Pages용 루트 robots에 기존 AI 학습 수집 제한을 적용합니다. GitHub 프로젝트 경로에 루트 정책을 잘못 생성하지 않습니다.
- [x] `enabled`와 CSP 완화는 아직 차단합니다.
- [x] 설정 변경 PR에서만 Pages 심사 모드 빌드를 추가 검사합니다.
- [x] sitemap의 빈 홈페이지 URL과 확장자가 없는 404 경로를 수정하고 회귀 검사했습니다.
- [x] PR #14 병합과 GitHub Pages 배포 성공을 확인했습니다. 병합 커밋은 `1777b56`입니다.
- [ ] 새 공개 안내 페이지의 운영 화면과 실제 탐색을 확인합니다.

근거: [PR #14](https://github.com/KimHG1995/work-history/pull/14), [두 대상 빌드](https://github.com/KimHG1995/work-history/actions/runs/36384457939), [병합 후 배포](https://github.com/KimHG1995/work-history/actions/runs/36394822290). 일반 테스트 71개, Worker 모의 통합 테스트 7개와 대상별 HTML 38개 검사를 통과했습니다. 설정 설명은 [정적 사이트 심사 준비](static-site-verification.md)에 있습니다.

## Pages Direct Upload

- [x] 기존 GitHub 기본 대상과 AI 주소를 유지하며 Pages 대상을 선택하도록 구현했습니다.
- [x] 공개 설정과 SHA를 고정하고 마지막 정적 빌드 1회에만 운영 설정을 전달합니다.
- [x] 한 실행에서는 한 호스팅만 업로드합니다.
- [x] 일반 Pages 전용 토큰을 마지막 업로드 단계로 제한하고 Worker 토큰과 분리했습니다.
- [x] Functions 진입점, 심볼릭 링크, 환경 파일과 비정적 설정을 거절합니다.
- [x] 업로드 전에 실제 프로젝트와 Origin, 운영 브랜치, Direct Upload 여부를 조회합니다.
- [x] Worker 설정과 분리한 임시 폴더에서 업로드하고 성공과 실패 모두 정리합니다.
- [x] 업로드 직전 main 조상 관계와 최신 사이트 입력을 검사합니다.
- [x] 코드 `bbad6bd`의 일반 테스트 87개, Worker 모의 테스트 7개와 두 대상 빌드가 통과했습니다.
- [x] 대상별 HTML 38개와 정적 산출물을 검사했습니다. 당시 CLI 검사는 help 실행뿐이었으며 실제 설정 검사 보완은 아래에 구분합니다.
- [x] PR #15를 병합했습니다. 병합 커밋은 `e7ce0a6`입니다.
- [x] PR #15 병합 후 GitHub Pages 배포가 성공하고 Cloudflare job이 생략된 것을 확인했습니다.
- [x] [Direct Upload 운영 안내](pages-direct-upload.md)를 작성했습니다.

근거: [PR #15](https://github.com/KimHG1995/work-history/pull/15), [검증 실행](https://github.com/KimHG1995/work-history/actions/runs/36495783083/job/109174909203), [병합 후 배포](https://github.com/KimHG1995/work-history/actions/runs/36497210716). 작성자가 자체 검토했습니다. 독립 리뷰는 받지 않았습니다.

## 최초 설정 자동화

- [x] main에서 확인한 수동 실행에만 프로젝트 조회와 생성을 허용합니다.
- [x] 선택한 두 Secret 이름만 허용하고 빈 토큰을 다른 토큰으로 자동 대체하지 않습니다.
- [x] 기존 프로젝트는 조회만 하고, 명확한 프로젝트 없음 응답에서만 최초 생성합니다.
- [x] 실제 subdomain으로 `SITE_ORIGIN`을 결정합니다. 주소를 추측하지 않습니다.
- [x] 최초 업로드는 `off`와 strict CSP로 고정하고 기존 GitHub 운영 대상은 바꾸지 않습니다.
- [x] 공개 주소와 배포 메타데이터만 산출물로 보존합니다.
- [x] 검토한 주소 파일을 `site/pages.project.json`에 반영하면 일반 배포도 수동 Origin 등록 없이 사용하도록 구현했습니다.
- [x] PR #16의 일반 테스트 103개, Worker 모의 테스트 7개와 두 대상 빌드를 확인했습니다.
- [x] PR #16을 병합하고 기존 GitHub Pages 배포 성공을 확인했습니다. 병합 커밋은 `b8728bb`입니다.
- [x] 업데이트한 `CLOUDFLARE_API_TOKEN`으로 실제 최초 설정을 실행해 프로젝트 조회 성공을 확인했습니다. 업로드 성공과는 구분합니다.
- [x] 실행 산출물에서 프로젝트 `work-history`와 실제 Origin `https://work-history-4gn.pages.dev`를 확보했습니다.
- [x] 확인한 공개 주소를 [사이트 설정 파일](../site/pages.project.json)에 보존하는 변경을 PR #17에 포함했습니다.
- [ ] 최초 Pages 업로드와 실제 운영 화면을 확인합니다.

근거: [PR #16](https://github.com/KimHG1995/work-history/pull/16), [실제 최초 설정과 재실행](https://github.com/KimHG1995/work-history/actions/runs/36504809476). 두 번째 시도에서 프로젝트 재사용, 주소 산출물 저장과 Pages용 빌드가 성공했지만 최종 업로드는 실패했습니다. 프로젝트 주소 확보를 웹사이트 배포 성공으로 표시하지 않습니다.

최초 설정은 push, PR, 댓글이나 정기 작업으로 실행하지 않습니다. 토큰 원문을 대화로 전달하지 않습니다.

## 최초 실행에서 확인한 오류와 수정

- [x] 생성 후 재조회에서 HTTP 404, 코드 8000007로 중단되는 경로를 재현했습니다. 처음 조회와 생성 후 조회의 오류 단계도 구분합니다.
- [x] 생성 성공 뒤의 명확한 프로젝트 없음 응답에만 조회를 최대 3회 수행하도록 수정했습니다. 대기는 1초와 2초이며 생성 요청은 재시도하지 않습니다.
- [x] 업로드 임시 `wrangler.json`의 필수 `name` 누락을 수정했습니다. 검증한 프로젝트명만 추가하고 정적 템플릿의 허용 항목은 유지합니다.
- [x] 신규 회귀 검사 4개의 실패를 먼저 확인한 뒤, 수정 후 일반 검사 107개 통과를 확인했습니다.
- [x] 두 대상의 실제 빌드 산출물을 검증했습니다. 실제 잠금 CLI에서도 기존 설정의 필수 name 오류와 수정 설정의 인증 직전 도달을 비교했습니다. CLI에는 실제 인증값을 주지 않고 네트워크 소켓 연결을 차단했습니다.
- [ ] PR #17의 운영 반영 후 수정된 코드로 최초 업로드를 다시 확인합니다.

근거: [PR #17](https://github.com/KimHG1995/work-history/pull/17), [수정 전 회귀 실패](https://github.com/KimHG1995/work-history/actions/runs/36506098156), [수정 후 CI 성공](https://github.com/KimHG1995/work-history/actions/runs/36506990729), [Wrangler 필수 name 검사](https://github.com/cloudflare/workers-sdk/blob/wrangler%404.133.0/packages/workers-utils/src/config/validation-pages.ts). CLI 버전 확인 같은 부가 통신 시도 역시 검사 환경에서는 연결을 차단합니다. 운영 배포의 통신이나 보안 설정을 완화하지 않았습니다.

수정 후에는 `Pages 최초 설정`에서 최신 `main`으로 새 Run workflow를 시작해야 합니다. 예전 실패 실행의 Re-run은 이전 커밋을 다시 사용하므로 수정 검증에 사용하지 않습니다. 현재 프로젝트는 재사용하며 다시 생성하거나 삭제하지 않습니다. 일반 배포의 기본 대상은 아직 GitHub입니다.

## 운영 전환과 광고

- [ ] 새 운영 Origin의 AI CORS와 문서 버전을 확인하고 기존 Worker를 수동 갱신합니다.
- [ ] 무료 주소에서 직접 접근, 새로고침, 검색, Clarity와 선택적 AI를 확인합니다.
- [ ] 개인정보 안내의 실제 운영 조건과 연락 경로를 검토합니다.
- [ ] AdSense에 실제 주소를 등록하고 게시자 ID를 제공한 뒤 소유권 확인과 심사를 요청합니다.
- [ ] 광고 페이지의 정적 CSP 변경안을 검토하고 승인합니다.
- [ ] 인증 CMP, 광고 동의와 분석 동의, 동의 철회를 연결합니다.
- [ ] 허용한 상세 문서 하단의 반응형 광고 1개와 중복 등록, SPA 탐색을 검증합니다.
- [ ] Google 승인 뒤 광고를 활성화하고 실제 표시를 확인합니다.
- [ ] 광고 중단과 재배포, 정상 배포 복구를 검증합니다.
- [ ] 검증 뒤 운영 대상을 Pages로 전환하고 기존 GitHub Pages의 이전 안내를 남깁니다.

이력서 첫 화면과 목록에는 광고를 넣지 않습니다. Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions와 신규 광고 Worker는 사용하지 않습니다.

## 별도 점검

- [ ] 최신 npm ci의 의존성 취약점 경고 6건(중간 5건, 높음 1건)의 영향과 수정 범위를 확인합니다. 이번 오류 수정은 의존성 파일을 변경하지 않았습니다.
- [ ] Actions Node.js 지원 종료 경고를 정리합니다.
- [ ] 큰 JavaScript 번들의 초기 로딩 영향을 확인합니다.
