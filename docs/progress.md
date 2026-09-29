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
- [x] 대상별 HTML 38개와 정적 산출물을 검사했습니다. CLI 형식은 계정 호출 없는 help 실행으로 확인했습니다.
- [x] PR #15를 병합했습니다. 병합 커밋은 `e7ce0a6`입니다.
- [x] PR #15 병합 후 GitHub Pages 배포가 성공하고 Cloudflare job이 생략된 것을 확인했습니다.
- [x] [Direct Upload 운영 안내](pages-direct-upload.md)를 작성했습니다.

근거: [PR #15](https://github.com/KimHG1995/work-history/pull/15), [검증 실행](https://github.com/KimHG1995/work-history/actions/runs/36495783083/job/109174909203), [병합 후 배포](https://github.com/KimHG1995/work-history/actions/runs/36497210716). 작성자가 자체 검토했습니다. 독립 리뷰는 받지 않았습니다.

## 최초 설정 자동화

다음 체크는 구현과 로컬 모의 검사 기준입니다. 실제 토큰 권한이나 프로젝트 생성 성공을 뜻하지 않습니다. 전체 저장소 CI와 병합 결과는 해당 구현 PR에 기록합니다.

- [x] main에서 확인한 수동 실행에만 프로젝트 조회와 생성을 허용합니다.
- [x] 선택한 두 Secret 이름만 허용하고 빈 토큰을 다른 토큰으로 자동 대체하지 않습니다.
- [x] 기존 프로젝트는 조회만 하고, 명확한 프로젝트 없음 응답에서만 최초 생성합니다.
- [x] 실제 subdomain으로 `SITE_ORIGIN`을 결정합니다. 주소를 추측하지 않습니다.
- [x] 최초 업로드는 `off`와 strict CSP로 고정하고 기존 GitHub 운영 대상은 바꾸지 않습니다.
- [x] 공개 주소와 배포 메타데이터만 산출물로 보존합니다.
- [x] 검토한 주소 파일을 `site/pages.project.json`에 반영하면 일반 배포도 수동 Origin 등록 없이 사용하도록 구현했습니다.
- [x] 로컬 신규 테스트 16개가 통과했습니다. 이는 전체 저장소 테스트 수가 아닙니다.
- [ ] 업데이트한 토큰으로 실제 `Pages 최초 설정`을 실행해 권한과 계정 연결을 확인합니다.
- [ ] 실제 프로젝트명과 반환된 주소를 확보하고 공개 설정 파일을 PR로 반영합니다.
- [ ] 최초 Pages 업로드와 실제 운영 화면을 확인합니다.

최초 설정은 push, PR, 댓글이나 정기 작업으로 실행하지 않습니다. 현재 연결 도구가 수동 실행 시작을 지원하지 않으면 운영자가 Run workflow를 한 번 실행해야 합니다. 토큰 원문을 대화로 전달하지 않습니다.

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

- [ ] 기존 의존성 취약점 경고 3건의 영향과 수정 범위를 확인합니다.
- [ ] Actions Node.js 지원 종료 경고를 정리합니다.
- [ ] 큰 JavaScript 번들의 초기 로딩 영향을 확인합니다.
