# 사이트 보안

## 적용한 설정

- 빌드한 HTML에 CSP를 추가해 사이트 코드와 Clarity의 스크립트만 허용합니다.
- 빌드에 포함된 인라인 스크립트는 SHA-256 해시로 허용합니다. 임의의 인라인 스크립트와 HTML 이벤트 핸들러는 차단합니다.
- 외부 프레임, 플러그인 삽입, 폼 전송을 제한합니다.
- 외부 연결은 사이트 자체와 Clarity가 사용하는 주소로 제한합니다.
- Mermaid는 `securityLevel: 'strict'`로 렌더링합니다.
- 스타일의 인라인 사용은 테마와 Mermaid 렌더링을 위해 허용합니다.

Clarity 허용 주소는 [Microsoft 안내](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp)를 기준으로 설정했습니다.

## AI 수집 제한

`security/domain-root/robots.txt`는 AI 학습 수집 봇에 `/work-history/` 수집을 거부하는 설정입니다. 일반 검색엔진과 검색용 봇은 허용합니다.

이 파일은 반드시 `https://kimhg1995.github.io/robots.txt`에서 제공해야 합니다. `/work-history/robots.txt`에 배포하는 것으로는 적용되지 않습니다.

robots.txt는 요청 차단 기능이 아닙니다. 규칙을 따르지 않는 수집기, 공개 저장소 복제, 사용자가 직접 복사하는 행위는 막지 못합니다. 강제 차단과 요청 횟수 제한에는 별도 CDN이나 서버가 필요합니다. [robots.txt의 한계](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

## 검증과 제한

- `npm run docs:build`는 페이지별 스크립트 해시와 CSP를 생성합니다.
- 배포 파일을 직접 수정하지 않고 원본을 수정한 뒤 다시 빌드합니다.
- CSP는 허용되지 않은 브라우저 동작을 제한하며, 모든 취약점이나 악성 코드를 탐지하는 기능은 아닙니다.
- GitHub Pages에서는 CSP를 HTML meta로 적용합니다. HTTP 응답 헤더가 필요한 `frame-ancestors`와 WAF 설정은 포함하지 않습니다.
- 허용된 Clarity 코드와 사이트 배포 권한은 계속 신뢰 경계에 포함됩니다.
