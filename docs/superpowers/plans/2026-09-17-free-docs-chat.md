# 무료 문서 질문 봇 구현 계획

목표: 공개 Markdown에 답하는 무료 전용 봇을 배포한다.

설계: [요청 정책](../specs/2026-09-17-free-docs-chat-design.md). VitePress 질문 패널, Worker API, SQLite Durable Object 한도 관리로 구성한다. 직접 순서대로 구현한다.

- [x] `tests/chat.test.mjs`: 검색, 입력 검증, 요청 제한, 무료 모델 고정, 오류 처리 테스트를 먼저 작성하고 실패 확인.
- [x] `scripts/prepare-chat.mjs`, `worker/search.mjs`: 공개 문서만 검색 자료로 생성하고 관련 발췌 선택.
- [x] `worker/policy.mjs`, `worker/index.mjs`: 제한을 원자적으로 예약하고 무료 라우터 호출. 키와 원문 질문을 로그에 남기지 않음.
- [x] `site/.vitepress/theme/DocsChat.vue`: 접근 가능한 질문 패널과 문서 링크, Clarity 마스킹, 오류 안내.
- [x] `scripts/deploy-chat.mjs`, Worker 설정과 Pages workflow: 무료 계정 검증, Secret 전달, API 주소를 사이트 빌드로 전달.
- [x] 단위 테스트 6개, Worker 통합 테스트 3개, 사이트 빌드와 데스크톱 및 모바일 브라우저 검증.
- [ ] 실제 무료 응답 비용 0 확인.
- [ ] 문서 갱신, 커밋과 푸시, Worker와 GitHub Pages 배포 확인.

제약: `orcarouter/free`만 사용. 초당 1회, 분당 8회, IP별 10초 1회와 분당 3회, 동시 2회. 요청 4KB, 질문 500자, 출력 512토큰, 대기 30초. 유료 전환과 자동 재시도 없음.
