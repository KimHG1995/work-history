# 정적 사이트 설정과 광고 심사 준비

이 단계는 배포 대상 설정과 광고 없는 심사 자료 생성입니다. 실제 Pages 프로젝트 생성과 Direct Upload 연결, Google 심사, CMP, 광고 송출은 아직 수행하지 않습니다. [진행 체크리스트](progress.md)를 기준으로 완료 여부를 확인합니다.

## 기본 동작

기존 `npm run docs:build` 명령을 그대로 사용합니다. 별도 설정이 없으면 `https://kimhg1995.github.io/work-history/`를 기준으로 빌드하고 광고는 꺼집니다. PR #13의 기존 Worker 기본 주소도 유지하므로 `VITE_CHAT_API_URL`을 추가로 등록할 필요가 없습니다.

| 설정 | 규칙 |
| --- | --- |
| `SITE_TARGET` | 기본값 `github`. 신규 루트 배포를 준비할 때 `pages` |
| `SITE_ORIGIN` | GitHub는 기존 Origin. Pages는 사용자가 확정한 단일 프로젝트의 정확한 HTTPS Origin 필수 |
| `SITE_BASE` | GitHub는 `/work-history/`, Pages는 `/`. 대상과 다르면 오류 |
| `ADS_MODE` | 기본값 `off`. 이번 단계는 `verify`까지 지원 |
| `ADS_PUBLISHER_ID` | `verify`에서 실제 `ca-pub-` 게시자 ID 필수 |
| `ADS_CSP_MODE` | 현재 `strict`만 허용. 완화는 다음 보안 검토 단계 |

`enabled`는 슬롯 ID가 있더라도 현재 빌드 오류입니다. 광고 승인이나 CMP 구현이 끝난 것처럼 취급하지 않습니다. GitHub 프로젝트 경로는 도메인 루트 `ads.txt`를 제공할 수 없으므로 이번 구현에서는 `verify`를 허용하지 않습니다. 다른 루트 저장소와 DNS도 자동 수정하지 않습니다.

## 파일 역할

`scripts/site-config.mjs`가 설정과 공개 URL을 검증합니다. `site/.vitepress/config.mjs`와 `scripts/prepare-chat.mjs`가 같은 base를 사용합니다. canonical은 `transformPageData`에서 설정해 클라이언트 문서 이동에서도 페이지 데이터에 따라 갱신됩니다. sitemap은 실제 정적 페이지와 같은 공개 주소를 사용합니다.

`scripts/prepare-public.mjs`는 `site/pages/about.md`와 `site/pages/privacy.md`를 생성 디렉터리에 복사합니다. `prepare-site.mjs`가 기존 생성 디렉터리를 삭제한 뒤 실행합니다. 원본 안내 페이지는 삭제 대상이 아니며 AI 공개 문서 색인에는 추가하지 않습니다.

`verify`는 소유권 메타 태그와 판매자 확인용 `ads.txt`만 생성합니다. Google 광고 로더나 슬롯은 추가하지 않습니다. `off`로 다시 생성할 때 이전 확인 파일을 제거합니다. 광고를 켜거나 끄기 위해 이미 배포한 파일을 바꾸려면 재빌드와 배포가 필요합니다.

Pages 빌드는 기존 `security/domain-root/robots.txt`의 AI 학습 수집 제한을 루트에 맞춰 복사합니다. 이 파일은 이제 Pages 빌드의 실제 입력이므로 변경 영향 분류에도 반영했습니다. 기존 GitHub 루트 저장소는 수정하지 않습니다.

## 검사 범위와 실행 횟수

정적 빌드 마지막에 `scripts/verify-site-output.mjs`가 소개와 개인정보 페이지, 페이지별 canonical, sitemap, AI 링크 base, CSP, 광고 모드와 `ads.txt`를 확인합니다. 네트워크 요청이나 추가 빌드는 하지 않습니다.

설정 생성기와 관련 입력이 바뀐 PR에는 Pages `verify` 변형을 한 번 더 빌드합니다. 테스트 주소와 테스트 게시자 ID만 사용하고 업로드하지 않습니다. 일반 가이드와 콘텐츠 변경에는 이 추가 빌드를 하지 않습니다. `main`의 운영 배포 빌드는 기존과 같이 한 번입니다.

현재 배포 워크플로는 계속 GitHub Pages를 대상으로 합니다. 저장소 변수에 `SITE_TARGET=pages`를 넣기만 해서 Cloudflare로 전환되지 않습니다. Direct Upload 워크플로, 대상 설정 전달, 전용 토큰, 정적 전용 산출물 검사는 다음 단계에 연결합니다.

## 완료로 표시하지 않는 항목

실제 Pages 주소 발급, 사이트 배포, AdSense 소유권 확인과 심사 요청, Google 승인, 개인정보 안내 운영 검토, CMP 연결, 광고 CSP 완화, 실제 광고 표시, Worker 갱신은 별도 확인이 필요합니다. 기존 Worker의 GitHub Origin 허용은 이번 단계에서 넓히지 않습니다.

## 공식 기준

- [VitePress 1.6 사이트 설정](https://vuejs.github.io/vitepress/v1/reference/site-config)
- [VitePress 1.6 sitemap](https://vuejs.github.io/vitepress/v1/guide/sitemap-generation)
- [AdSense 사이트 등록과 소유권 확인 방법](https://support.google.com/adsense/answer/12169212?hl=en)
- [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
