# 근무 기록

[전체 안내](README.md)로 돌아갑니다.

## 공공 교육 서비스 기업

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 공공기관 대상 교육 플랫폼을 개발하고 운영하는 기업 |
| 근무 기간 | 2025-11 ~ 현재 |
| 소속 | 개발팀 |
| 역할 | 백엔드 개발 |
| 직급 | 대리 |
| 사용 언어 | TypeScript |
| 백엔드 | NestJS, Node.js, TypeORM |
| 프론트엔드 | React |
| 데이터베이스 | MySQL |
| 인프라와 메시지 | NCP, NCP SENS |
| 서비스 규모 | 활성 사용자 150만 명 이상 규모 |

### 공공 교육 플랫폼

[공공 교육 플랫폼 작업 목록](projects/public-education/README.md)

- [예약 메시지 발송 비용 개선](projects/public-education/reservation-messages.md): LMS 안내를 알림톡으로 전환하고 운영에 반영했습니다.
- [출결 상태와 단체 인증 처리 개선](projects/public-education/attendance.md): 출결 변경에 트랜잭션 적용, 단체 인증 병렬 처리와 실패 목록 분리.
- [예약과 취소의 동시 요청 처리 개선](projects/public-education/reservation.md): 트랜잭션과 DB 잠금으로 예약 상태와 잔여 인원 변경 처리.
- [운영 데이터 집계와 Google Sheets 자동화](projects/public-education/google-sheets-automation.md): 반복적인 수동 데이터 정리 업무를 분석해 자동화를 제안하고, 18개 시트의 데이터 집계와 이관을 자동화했습니다.
- [공공 교육 플랫폼 개발과 운영](projects/public-education/operations.md): 교육, 예약, 출결, 관리자 기능의 웹과 서버 개발, 운영 요구사항 반영과 이슈 대응.

## 에듀테크 기업 계열사

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 에듀테크 기업의 계열사 |
| 서비스 규모 | 재직 당시 월간 활성 사용자(MAU) 약 10만 명 |
| 근무 기간 | 2024-01 ~ 2025-10 |
| 역할 | 백엔드 개발 |
| 직급 | 대리 |
| 사용 언어 | TypeScript |
| 백엔드 | NestJS, Prisma, Drizzle |
| 데이터베이스와 스토리지 | MySQL, DynamoDB, S3 |
| 메시지 처리와 알림 | AWS SQS, Biztalk, Twilio, SendGrid |
| 프론트엔드 | React, Next.js, TailwindCSS, Refine, MUI Pro |

[교육 서비스 작업 목록](projects/education-services/README.md)

- [쿠폰 이벤트 시스템](projects/education-services/promotion.md): 여러 판매처의 구매 정보를 API와 파일 임포트로 연동하고, 템플릿 기반 쿠폰 발급과 관리자 풀스택 개발, 서버와 DB 설계를 맡았습니다.
- [AI 심리검사 서비스 개편](projects/education-services/assessment-renewal.md): Java Spring 서버를 NestJS와 Drizzle로 전환해 여러 서비스가 사용할 공통 서버를 만들고 운영에 배포했습니다.
- [통합 알림 시스템](projects/education-services/notifications.md): 공통 발송과 이력 추적, 배포 자동화를 구현하고 운영 서버에 배포했습니다.
- [계열사 연동 서비스 서버 재구성과 관리자 페이지 개발](projects/education-services/art-service-renewal.md): 기존 기능을 유지하며 Java 서버를 NestJS로 재구성하고, 인프라와 배포 자동화, 자랑하기 웹 페이지와 관리자 페이지를 맡았습니다.
- [개인 고객 서비스 관리자 페이지](projects/education-services/b2c-admin.md): 관련 부서와 필요한 기능을 논의해 풀스택으로 개발하고, 퇴사 전까지 기능 추가와 유지보수를 맡았습니다.
- [개인 고객 수강 앱 서버](projects/education-services/class-app-server.md): 선임 개발자의 DB와 아키텍처 설계를 지원하고, 서버 신규 개발과 사용 가능한 수강 데이터 및 콘텐츠 마이그레이션을 맡았습니다.

## 단기 구인구직 플랫폼

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 기업과 개인을 대상으로 단기 구인구직 서비스를 제공하는 플랫폼 기업 |
| 근무 기간 | 2021-07 ~ 2024-01 |
| 역할 | 백엔드 개발, 인터널팀 리드 |
| 서비스 대상 | 기업 대상 서비스(B2B), 개인 대상 서비스(B2C) |
| 서비스 규모 | 재직 당시 월간 활성 사용자(MAU) 평소 약 30만 명, 최대 100만 명 |
| 근무 당시 회사 단계 | 시리즈 A와 B 투자 유치 시기에 근무 |
| 사용 언어 | JavaScript, TypeScript |
| 코드 관리 | Bitbucket |

관리자 업무를 시스템으로 옮기고, 정산과 데이터 분석, 배포와 이벤트 운영 방식을 개선했습니다.
[플랫폼 작업 목록](projects/platform-operations/README.md)

- [관리자 페이지 개발과 기능 추가](projects/platform-operations/initial-admin.md): 초기 관리자 페이지를 혼자 개발하고, 근무 기간 동안 필요한 기능을 풀스택으로 추가했습니다.
- [급여 정산과 환불](projects/platform-operations/settlement.md): 약 한 달간 혼자 개발해 지급과 환불을 내부 관리자 페이지에서 처리하도록 했습니다.
- [관리자 화면과 API 개선](projects/platform-operations/admin-improvement.md): 기획과 API 수정을 맡고, 프론트엔드 개발자의 단계별 전환을 지원했습니다.
- [데이터 분석 환경과 대시보드](projects/platform-operations/data-analytics.md): DS와 데이터 구조를 정하고, 분석 환경 구성과 대시보드 집계 방식을 개선했습니다.
- [자동 배포](projects/platform-operations/deployment.md): 선임 개발자가 구성한 배포 환경에 맞춰 Bitbucket Pipelines를 작성했습니다.
- [이벤트 공통 코드 정리](projects/platform-operations/event-system.md): 영업과 마케팅의 요청을 정리하고, 백엔드와 DB 개발 및 이벤트 공통 코드 정리를 맡았습니다.

## TTS 서비스 기업

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | AI로 글을 음성으로 바꿔 영상과 교육 자료 제작에 활용하는 서비스를 제공하는 외국계 기업 |
| 근무 기간 | 2020-12 ~ 2021-06 (6개월) |
| 역할 | 인턴 |
| 주요 분야 | TTS. 글을 사람이 말하는 듯한 음성으로 바꾸는 기술 |
| 맡은 업무 | TTS 발음 교정 기능 개발, 웹 서비스 유지보수와 기능 개선 |
| 사용 언어 | TypeScript |
| 프론트엔드 | React, React Admin, MobX |
| 백엔드 | NestJS, Express |
| 데이터베이스 | MongoDB |

### TTS 발음 교정

- 시작한 이유: 원하는 음성 데이터를 직접 추출하기 어려워, 입력 글을 바꿔 발음을 교정할 방법이 필요했다.
- 진행 방식: 서버와 DB 개발을 혼자 맡았다.
- 맡은 일: 서버의 발음 교정 로직과 DB에 교정 정보를 저장하고 조회하는 방식을 설계하고 구현했다.
- 처리 방법: 원래 글과 유사한 발음이 나는 글을 짝지어 DB에 저장했다. 음성을 만들 때 저장한 내용을 찾아 입력 글을 바꾸도록 했다.
- 구현한 내용: 같은 발음 교정 규칙을 저장하고 다시 사용할 수 있게 했다.
- 운영 상태: 운영 중.

### 웹 서비스 유지보수와 기능 개선

- 화면과 서버의 기능 개선과 유지보수에 참여했다.
- 화면은 React, React Admin, MobX를 사용했다.
- 서버는 NestJS, Express, MongoDB를 사용했다.
- 운영 상태: 운영 중.

## 사이드 프로젝트

[PaperTrail 전자문서 생성과 증적 플랫폼](projects/papertrail/README.md)

- [전자문서 생성과 증적 플랫폼 개발](projects/papertrail/platform.md): 멀티테넌트 문서 생성 API와 비동기 렌더, 해시 기반 증적, 재현성 검증, Webhook과 운영 Admin을 구현했습니다.

[loglens API 로그 분석 백엔드](projects/loglens/README.md)

- [API 로그 분석 백엔드 MVP 개발](projects/loglens/mvp.md): ClickHouse Materialized View로 API 로그를 사전 집계하고 트래픽, 응답시간, 에러 리포트와 급증 알림을 구현했습니다.

| 기간 | 작업 | 맡은 범위 |
| --- | --- | --- |
| 2025-09 ~ 2025-11, 본업 병행 | [HR 계약과 현장 운영 SaaS MVP 개발](projects/hr-saas/mvp.md) | 관리자와 사용자 웹, 서버, DB, 인증, 스토리지와 배포 |

[AI 개발 환경 작업 목록](projects/ai-development-setup/README.md)

- [Codex 코드 검사 설정](projects/ai-development-setup/codex-quality.md): 개발, 검증과 후속 수정을 연결하는 공통 스킬과 프로젝트별 설정 설치 도구를 구성했습니다.
- [Claude Code 작업 규칙과 검증 설정](projects/ai-development-setup/claude-workflow.md): 요구사항 확인, 개발과 검증 흐름을 재사용할 수 있도록 규칙, 스킬과 훅을 구성했습니다.
- [TypeScript 코드 분석용 MCP 연결](projects/ai-development-setup/typescript-graph.md): 기존 서버 버전을 유지하며 TypeScript 7 기반 MCP 분석 환경과 등록 스크립트를 구성했습니다.
