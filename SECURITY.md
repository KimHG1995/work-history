# 사이트 보안

## 적용한 설정

- 빌드한 HTML에 CSP를 추가해 사이트 코드와 Clarity의 스크립트만 허용합니다.
- 빌드에 포함된 인라인 스크립트는 SHA-256 해시로 허용합니다. 임의의 인라인 스크립트와 HTML 이벤트 핸들러는 차단합니다.
- 외부 프레임, 플러그인 삽입, 폼 전송을 제한합니다.
- 외부 연결은 사이트 자체, Clarity와 배포한 질문 API의 정확한 주소로 제한합니다.
- Mermaid는 `securityLevel: 'strict'`로 렌더링합니다.
- 스타일의 인라인 사용은 테마와 Mermaid 렌더링을 위해 허용합니다.

Clarity 허용 주소는 [Microsoft 안내](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp)를 기준으로 설정했습니다.

## AI 수집 제한

`security/domain-root/robots.txt`는 AI 학습 수집 봇에 `/work-history/` 수집을 거부하는 설정입니다. 일반 검색엔진과 검색용 봇은 허용합니다.

[도메인 최상위 robots.txt](https://kimhg1995.github.io/robots.txt)에 배포했습니다. [루트 저장소](https://github.com/KimHG1995/KimHG1995.github.io)의 `main` 브랜치에서 게시하며, 정책 변경 시 이 저장소의 사본과 함께 갱신합니다.

robots.txt는 요청 차단 기능이 아닙니다. 규칙을 따르지 않는 수집기, 공개 저장소 복제, 사용자가 직접 복사하는 행위는 막지 못합니다. 강제 차단과 요청 횟수 제한에는 별도 CDN이나 서버가 필요합니다. [robots.txt의 한계](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

## 검증과 제한

- `npm run docs:build`는 페이지별 스크립트 해시와 CSP를 생성합니다.
- 배포 파일을 직접 수정하지 않고 원본을 수정한 뒤 다시 빌드합니다.
- CSP는 허용되지 않은 브라우저 동작을 제한하며, 모든 취약점이나 악성 코드를 탐지하는 기능은 아닙니다.
- GitHub Pages에서는 CSP를 HTML meta로 적용합니다. HTTP 응답 헤더가 필요한 `frame-ancestors`와 WAF 설정은 포함하지 않습니다.
- 허용된 Clarity 코드와 사이트 배포 권한은 계속 신뢰 경계에 포함됩니다.

## 문서 질문 봇

- 공개 경력 문서만 검색하며 비공개 원본과 작성 규칙은 전달하지 않습니다.
- OrcaRouter 키는 Worker Secret에만 저장합니다. 브라우저에는 API 주소만 전달합니다.
- 무료 라우터만 호출하며 답변의 비용 필드나 별도 정산 기록에서 USD 0을 확인합니다. 확인할 수 없으면 추가 AI 호출을 중단합니다.
- 하나의 Durable Object에서 요청 한도와 동시 처리 수를 관리합니다. 저장소 오류가 나면 호출하지 않습니다.
- 원본 IP와 질문은 한도 기록에 저장하지 않습니다. IP는 날짜별 HMAC으로 변환합니다.
- 허용 출처 검사는 인증을 대신하지 않습니다. 공개 API 요청에는 서버 한도를 적용합니다.
- 답변은 일반 텍스트로 표시하며 문서 링크는 공개 문서 목록과 대조합니다.
- 질문 창은 Clarity 마스킹을 적용합니다. Worker 로그 수집은 비활성화합니다.
- 제한 또는 장애가 발생하면 브라우저에서 관련 문서를 찾습니다.

자세한 수치는 [문서 질문 봇 설계](docs/superpowers/specs/2026-09-17-free-docs-chat-design.md)에 정리했습니다.
