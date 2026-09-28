# 정적 사이트와 광고 도입 진행 상태

기준일: 2026-09-29

이 파일은 검증한 구현과 운영 상태를 구분합니다. [최초 실행 계획](superpowers/plans/2026-09-28-static-adsense-minimal-cloudflare.md)의 미착수 표시는 최초 설계 시점의 기록입니다. 확인하지 않은 계정 설정과 외부 서비스 상태는 완료로 표시하지 않습니다.

## CI 분리와 기존 AI 주소 복구

- [x] 내부 가이드, 공개 콘텐츠, 사이트 코드, Worker 코드의 변경 영향을 분류했습니다.
- [x] 내부 가이드만 바뀌면 문서 검사만 실행합니다. Mermaid가 없으면 npm 설치도 하지 않습니다.
- [x] PR은 검증만 수행하고 사이트와 Worker를 배포하지 않습니다.
- [x] Worker 배포와 실제 AI 검증을 승인한 수동 실행으로 분리했습니다.
- [x] 문서 버전 불일치와 연결 실패에서 로컬 검색을 제공하도록 구현하고 모의 테스트했습니다.
- [x] PR #12를 병합하고 GitHub Pages 배포 성공을 확인했습니다. 병합 커밋은 `a3ae171`입니다.
- [x] 별도 `VITE_CHAT_API_URL` 등록 없이 기존 Worker 주소를 사용하도록 복구했습니다. 클라이언트와 CSP가 같은 설정을 사용합니다.
- [x] PR #13을 병합하고 GitHub Pages 배포 성공을 확인했습니다. 병합 커밋은 `cdb6a01`입니다.
- [ ] 기존 Worker를 문서 버전 응답이 있는 코드로 갱신하고 운영 health에서 확인합니다.
- [ ] 운영 페이지에서 실제 AI 답변 복구를 확인합니다. 주소 복구만으로 완료 처리하지 않습니다.

근거: [PR #12](https://github.com/KimHG1995/work-history/pull/12), [PR #13](https://github.com/KimHG1995/work-history/pull/13), [PR #13 배포](https://github.com/KimHG1995/work-history/actions/runs/36379848587).

## 배포 설정과 AdSense 심사 준비

- [x] `SITE_TARGET`, `SITE_ORIGIN`, `SITE_BASE`를 검증하고 기존 GitHub 설정을 기본값으로 유지합니다.
- [x] 실제 Pages Origin을 지정한 경우에만 루트 경로로 빌드합니다. 주소를 추측하지 않습니다.
- [x] 검색 색인, canonical, sitemap과 사이트 base를 같은 설정으로 계산합니다.
- [x] Clarity는 지정한 운영 Origin에서만 실행합니다.
- [x] 소개와 개인정보 안내를 원본에서 생성합니다. AI 색인에는 넣지 않습니다.
- [x] `off`와 `verify`를 분리했습니다. `verify`는 게시자 ID를 받아 메타 태그와 `ads.txt`만 생성합니다.
- [x] `off`로 되돌리면 이전 광고 확인 파일과 게시자 메타 정보가 남지 않도록 검사합니다.
- [x] Pages용 robots에 기존 AI 학습 수집 제한을 적용합니다. GitHub 프로젝트 경로에 루트 robots를 잘못 생성하지 않습니다.
- [x] `enabled`와 CSP 완화는 아직 빌드 오류로 차단합니다.
- [x] 설정 변경 PR에서만 Pages 심사 모드 빌드를 추가 검사합니다. 일반 콘텐츠 변경과 운영 배포에는 추가하지 않습니다.
- [x] sitemap의 빈 홈페이지 URL과 확장자가 없는 404 경로를 수정하고 회귀 검사했습니다.
- [x] PR #14를 병합했습니다. 병합 커밋은 `1777b56`입니다.
- [x] PR #14 병합 후 GitHub Pages 빌드와 배포 job의 성공을 확인했습니다.
- [ ] 새 공개 안내 페이지의 운영 화면과 실제 탐색을 확인합니다. 배포 job 성공과 구분합니다.

근거: [PR #14](https://github.com/KimHG1995/work-history/pull/14), [두 대상 빌드](https://github.com/KimHG1995/work-history/actions/runs/36384457939), [병합 후 배포](https://github.com/KimHG1995/work-history/actions/runs/36394822290). PR 검증은 일반 테스트 71개, Worker 모의 통합 테스트 7개와 대상별 HTML 38개 검사를 통과했습니다.

설정 설명은 [정적 사이트 심사 준비](static-site-verification.md)에 있습니다.

## Pages Direct Upload 코드 준비

아래 항목은 PR #15의 코드와 자동 검사 기준입니다. 실제 Cloudflare 계정 연결이나 광고 표시 완료를 뜻하지 않습니다. 병합과 이후 배포 실행의 최신 결과는 [PR #15](https://github.com/KimHG1995/work-history/pull/15)에서 확인합니다.

- [x] 기본 GitHub 대상과 기존 AI 주소를 유지하면서 Pages 대상을 선택하도록 구현했습니다.
- [x] 공개 설정과 SHA를 고정하고 마지막 정적 빌드 1회에만 운영 대상 설정을 전달합니다.
- [x] 한 실행에서는 GitHub 또는 Pages 중 한 곳만 업로드합니다.
- [x] Pages 전용 토큰을 마지막 업로드 단계로 제한하고 기존 Worker 토큰과 분리했습니다.
- [x] Functions 진입점, 심볼릭 링크, 환경 파일과 비정적 설정을 거절합니다.
- [x] 실제 프로젝트와 Origin, 운영 브랜치, Direct Upload 여부를 읽기 전용으로 확인하도록 구현했습니다.
- [x] 기존 Worker 설정과 분리한 임시 폴더에서 업로드하고 성공과 실패 모두 정리합니다.
- [x] 업로드 직전 main 조상 관계와 최신 사이트 입력을 검사합니다.
- [x] 코드 커밋 `bbad6bd`의 일반 테스트 87개와 Worker 모의 통합 테스트 7개가 통과했습니다.
- [x] GitHub/off와 Pages/verify 빌드, 대상별 HTML 38개와 정적 업로드 검사를 통과했습니다. CLI 형식은 계정 호출 없는 help 실행으로 검사했습니다.
- [x] [Direct Upload 운영 안내](pages-direct-upload.md)에 최초 설정, 전환과 복구 절차를 작성했습니다.

근거: [PR #15 검증 실행](https://github.com/KimHG1995/work-history/actions/runs/36495783083/job/109174909203). 별도 독립 리뷰는 받지 않았고 작성자가 자체 검토했습니다. 전체 검증은 GitHub Actions에서 수행했습니다.

## 실제 운영 전환과 광고

- [ ] 무료 Direct Upload 프로젝트와 최종 운영 주소를 확정합니다.
- [ ] 실제 프로젝트의 계정 ID와 Pages 전용 토큰을 등록합니다.
- [ ] 기존 GitHub 설정을 유지한 채 승인한 수동 Pages 최초 배포를 실행합니다.
- [ ] 새 운영 Origin에 맞춘 AI CORS와 문서 버전을 확인하고 기존 Worker를 수동 갱신합니다.
- [ ] 무료 주소에서 직접 접근, 새로고침, 검색, Clarity와 선택적 AI를 확인합니다.
- [ ] 개인정보 안내의 실제 운영 조건과 연락 경로를 검토합니다.
- [ ] AdSense에 실제 주소를 등록하고 게시자 ID를 제공한 뒤 소유권 확인과 심사를 요청합니다.
- [ ] 광고 페이지의 정적 CSP 변경안을 검토하고 승인합니다.
- [ ] 인증 CMP와 광고 동의, 분석 동의, 동의 철회를 연결합니다.
- [ ] 허용한 상세 문서 하단의 반응형 광고 1개와 중복 등록, SPA 탐색을 검증합니다.
- [ ] Google 승인 후 광고를 활성화하고 실제 표시를 확인합니다.
- [ ] 광고 중단과 재배포, 정상 배포 복구를 검증합니다.
- [ ] 새 주소 검증 후 운영 대상을 Pages로 전환하고 기존 GitHub Pages의 이전 안내를 남깁니다.

이력서 첫 화면과 목록에는 광고를 넣지 않습니다. Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions와 신규 광고 Worker는 사용하지 않습니다. 실제 계정 설정이 없을 때 주소를 추측하거나 검사를 건너뛰지 않습니다.

## 별도 점검

- [ ] 기존 의존성 취약점 경고 3건의 영향과 수정 범위를 확인합니다.
- [ ] Actions Node.js 지원 종료 경고를 정리합니다.
- [ ] 큰 JavaScript 번들의 초기 로딩 영향을 확인합니다.
