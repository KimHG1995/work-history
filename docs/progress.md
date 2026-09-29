# 정적 사이트와 광고 도입 진행 상태

기준일: 2026-09-29

코드 구현, 자동 검사, 병합, 실제 배포와 사용자 확인을 구분합니다. [최초 명세](superpowers/specs/2026-09-28-static-adsense-minimal-cloudflare-design.md)와 [실행 계획](superpowers/plans/2026-09-28-static-adsense-minimal-cloudflare.md)은 최초 설계 기록입니다. 현재 운영 절차는 [Pages 배포](pages-direct-upload.md)와 [AI 연결](chat-connection.md)을 기준으로 합니다.

## CI 분리와 기존 AI 주소 복구

- [x] 변경 영향을 분류하고 내부 가이드만 변경하면 문서 검사만 수행합니다. Mermaid가 없으면 npm 설치도 하지 않습니다.
- [x] PR의 운영 배포를 제외하고 사이트 입력이 변경될 때만 정적 배포합니다.
- [x] 기존 AI Worker를 수동 배포로 분리하고 문서 버전이 다를 때 로컬 검색으로 전환합니다.
- [x] 별도 VITE_CHAT_API_URL 등록 없이 기존 주소를 사용하고 CSP와 일치시킵니다.
- [x] PR #12와 #13을 병합하고 당시 GitHub Pages 배포를 확인했습니다.
- [x] 기존 Worker를 문서 버전 응답이 있는 코드로 실제 갱신했습니다.
- [x] 사용자가 챗봇 답변이 정상적으로 온다고 확인했습니다. 자동 실호출 검사 성공과는 구분합니다.

근거: [PR #12](https://github.com/KimHG1995/work-history/pull/12), [PR #13](https://github.com/KimHG1995/work-history/pull/13), [실제 Worker 배포](https://github.com/KimHG1995/work-history/actions/runs/36514274673/job/109232982902). 마지막 실행은 배포와 health 검증은 성공했고, 실제 무료 답변 검사는 429로 실패했습니다.

## 사이트 설정과 AdSense 심사 준비

- [x] Origin과 base, 검색 링크, canonical, sitemap을 배포 대상별로 처리합니다.
- [x] Clarity는 정확한 운영 Origin에서만 실행합니다.
- [x] 소개와 개인정보 안내를 별도 원본에서 생성하고 AI 색인에서는 제외합니다.
- [x] off와 verify를 분리하고 verify에는 메타 태그와 ads.txt만 생성합니다.
- [x] off로 돌아가면 이전 게시자 확인 파일이 남지 않도록 검사합니다.
- [x] Pages 루트 robots에 기존 AI 학습 수집 제한을 적용합니다.
- [x] sitemap의 빈 홈페이지 경로와 404 제외를 수정하고 두 대상 빌드를 검증했습니다.
- [x] PR #14를 병합하고 당시 GitHub Pages 배포를 확인했습니다.
- [x] PR #19에서 공개 안내의 광고 준비 상태와 내부 구현 설명을 제거했습니다. 실제 사용 중인 방문 분석과 AI 전송 안내는 유지했습니다.
- [ ] 수정된 공개 안내의 Pages 운영 반영과 실제 브라우저 탐색을 확인합니다.

근거: [PR #14](https://github.com/KimHG1995/work-history/pull/14), [PR #19](https://github.com/KimHG1995/work-history/pull/19), [안내 수정의 GitHub 배포](https://github.com/KimHG1995/work-history/actions/runs/36522370918).

## Pages Direct Upload와 최초 설정

- [x] 정적 빌드 1회, 검증한 산출물 업로드와 토큰 단계 분리를 구현했습니다.
- [x] Functions, 심볼릭 링크, 환경 파일과 비정적 설정을 차단합니다.
- [x] 실제 프로젝트와 운영 브랜치, Origin과 최신 main을 확인한 뒤 격리된 설정으로 업로드합니다.
- [x] PR #15와 #16을 병합했습니다.
- [x] 최초 설정에서 프로젝트를 조회하고 필요한 경우만 생성하도록 구현했습니다.
- [x] 실제 프로젝트 work-history와 Origin https://work-history-4gn.pages.dev를 확보해 site/pages.project.json에 보존했습니다.
- [x] 생성 직후 조회와 임시 Wrangler 설정의 name 누락을 PR #17에서 수정했습니다.
- [x] 수정된 main 1b8c0bb의 실제 최초 Pages 업로드를 확인했습니다.

근거: [PR #15](https://github.com/KimHG1995/work-history/pull/15), [PR #16](https://github.com/KimHG1995/work-history/pull/16), [PR #17](https://github.com/KimHG1995/work-history/pull/17), [Pages 최초 업로드 성공](https://github.com/KimHG1995/work-history/actions/runs/36510678198/job/109221866039). 최초 업로드는 off와 strict CSP로 진행했습니다. 프로젝트를 다시 만들거나 초기화를 반복하지 않습니다.

## Pages에서 기존 AI Worker 연결

- [x] 확인된 GitHub와 Pages Origin만 허용하고 사이트별 문서 해시와 출처 경로를 맞췄습니다.
- [x] 같은 global-v1의 한도와 캐시를 유지하고 PR #18을 병합했습니다.
- [x] 일반 테스트 111개와 Worker 모의 통합 검사 10개를 통과했습니다.
- [x] 실제 Worker 배포와 두 Origin의 health, release, CORS, 문서 버전 확인이 성공했습니다.
- [ ] 배포 당시 실패한 무료 실호출의 구체적 거절 사유를 확인합니다. 이후 사용자 정상 답변 확인과 구분합니다.

근거: [PR #18](https://github.com/KimHG1995/work-history/pull/18), [운영 실행 결과](https://github.com/KimHG1995/work-history/pull/18#issuecomment-5882751721). err_free_access_denied만으로 영구 접근 불가나 과금 필요를 단정하지 않습니다. 기본 60초 안내를 공급자의 복구 보장으로 보지 않습니다.

## 운영 배포와 실호출 검증 분리

- [x] Worker 배포에서 실제 AI 요청을 제거했습니다.
- [x] 토큰, 의존성 설치와 배포 없이 실행하는 별도 AI 연결 확인 워크플로를 추가했습니다. 실제 무료 요청은 별도 선택 시 1회입니다.
- [x] 일반 배포의 기본 대상을 Pages로 정하고 GitHub는 마지막 정상본과 수동 복구 경로로 유지했습니다.
- [x] 일반 Pages 배포도 실제 사용한 CLOUDFLARE_API_TOKEN을 기본 선택합니다. 전용 토큰 선택은 두 허용된 Secret 이름으로 한정하며 빈 값의 자동 대체는 하지 않습니다.
- [x] 업로드 결과와 공개 페이지의 실제 HTTP 확인을 별도 단계로 기록하도록 구현했습니다.
- [x] 배포 후 표본 파일의 바이트 일치와 잘못된 Origin, 경로 및 외부 AI 실패의 회귀 검사를 추가했습니다.
- [ ] 이 변경의 전체 PR 검사와 병합 결과를 확인합니다.
- [ ] 일반 Pages 자동 업로드와 공개 파일 HTTP 확인을 실제 실행에서 확인합니다.
- [ ] 새 독립 AI 연결 확인 워크플로를 실제 실행합니다. 코드 검증만으로 실제 모델 성공을 표시하지 않습니다.
- [ ] 기존 GitHub Pages 방문자용 이전 안내를 추가합니다. 기존 주소나 루트 저장소를 임의로 삭제하지 않습니다.

코드 구현 체크와 실제 실행 체크는 별개입니다. 이 변경의 PR에 최신 검사, 병합과 업로드 결과를 남깁니다. 공개 HTTP 확인은 광고와 Clarity 스크립트를 실행하지 않으므로 화면 배치, 브라우저 탐색이나 분석 수집까지 확인한 것은 아닙니다.

## 운영 전환과 광고

- [ ] 모바일과 데스크톱의 실제 화면, 직접 접근, 새로고침과 검색을 확인합니다.
- [ ] Clarity의 실제 수집을 확인합니다.
- [ ] 개인정보 안내의 실제 운영 조건과 연락 경로를 검토합니다.
- [ ] 실제 AdSense 게시자 ID를 연결하고 무료 주소의 소유권 확인과 심사를 요청합니다.
- [ ] 광고 페이지의 정적 CSP 변경안을 검토하고 승인합니다.
- [ ] 인증 CMP, 광고와 분석 동의 및 철회를 연결합니다.
- [ ] 허용된 상세 문서 하단 광고 1개와 중복 초기화, SPA 탐색을 검증합니다.
- [ ] Google 승인 이후 실제 광고 표시, 중단과 재배포, 복구를 검증합니다.

현재 enabled와 CSP 완화는 차단 상태입니다. 게시자 ID와 슬롯 ID를 추측하거나 Google 심사와 약관 동의를 대신 완료하지 않습니다. 이력서 첫 화면과 목록에는 광고를 넣지 않습니다. 광고 계획은 내부 docs에서 관리하고 공개 안내에는 실제 적용되는 정보 처리만 적습니다.

Cloudflare 자체 빌드, PR 미리보기 배포, Pages Functions와 광고용 신규 Worker를 추가하지 않습니다.

## 별도 점검

- [ ] 의존성 취약점 경고 6건의 실제 영향과 수정 범위를 확인합니다. 기존 보고는 중간 5건, 높음 1건이며 이후 실행 결과를 다시 확인해야 합니다.
- [ ] Actions Node.js 지원 종료 경고를 정리합니다.
- [ ] 큰 JavaScript 번들의 초기 로딩 영향을 확인합니다.
