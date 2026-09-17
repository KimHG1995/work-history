# 전체 작업 목록

[전체 안내](../README.md)로 돌아갑니다.

## 회사 프로젝트

### 민방위 서비스 개발과 운영 개선

2025-11 ~ 현재 | [프로젝트 개요](civil-defense/README.md)

| 작업 | 요약 |
| --- | --- |
| [예약 메시지 발송 비용 개선](civil-defense/reservation-messages.md) | 반복 발송 비용을 줄이기 위한 알림톡 전환 제안과 구현 |
| [출결 상태와 단체 인증 처리 개선](civil-defense/attendance.md) | 출결 상태 변경을 트랜잭션으로 묶고 단체 인증의 병렬 처리와 실패 목록 구현 |
| [예약과 취소의 동시 요청 처리 개선](civil-defense/reservation.md) | 예약과 취소의 상태 변경, 잔여 인원 갱신을 트랜잭션과 DB 잠금으로 처리 |
| [민방위 서비스 개발과 운영](civil-defense/operations.md) | 운영팀 요청 기능 개발, API 개선과 운영 이슈 대응 |

### 예비군 서비스 개발과 운영

2025-11 ~ 현재 | [프로젝트 개요](reserve-service/README.md)

| 작업 | 요약 |
| --- | --- |
| [예비군 서비스 개발과 운영](reserve-service/operations.md) | React 웹과 Node.js 서버의 풀스택 개발 및 유지보수 |

### 교육 서비스 개발과 운영 개선

2024-01 ~ 2025-10 | [프로젝트 개요](education-services/README.md)

| 작업 | 요약 |
| --- | --- |
| [쿠폰 이벤트 시스템](education-services/promotion.md) | 판매처 구매 정보 연동, 쿠폰 템플릿과 이벤트 구조 설계, 관리자 풀스택 개발 |
| [AI 심리검사 서비스 개편](education-services/assessment-renewal.md) | Java Spring 서버를 NestJS와 Drizzle 기반 공통 심리검사 서버로 전환 |
| [통합 알림 시스템](education-services/notifications.md) | 공통 알림 발송, 이력 추적과 배포 자동화 구현 |
| [계열사 연동 서비스 서버 재구성과 관리자 페이지 개발](education-services/art-service-renewal.md) | Java 서버를 NestJS로 재구성하고 인프라, 배포, 자랑하기 웹과 관리자 페이지 개발 |
| [개인 고객 서비스 관리자 페이지](education-services/b2c-admin.md) | 관련 부서와 기능을 정리하고 관리자 페이지를 풀스택으로 개발 및 유지보수 |
| [개인 고객 수강 앱 서버](education-services/class-app-server.md) | 선임 개발자의 설계를 지원하고 수강 앱 서버 신규 개발과 데이터 마이그레이션 수행 |

### 단기 구인구직 플랫폼 운영 개선

2021-07 ~ 2024-01 | [프로젝트 개요](platform-operations/README.md)

| 작업 | 요약 |
| --- | --- |
| [관리자 페이지 개발과 기능 추가](platform-operations/initial-admin.md) | 초기 관리자 페이지 단독 개발과 이후 풀스택 기능 추가 |
| [급여 정산과 환불](platform-operations/settlement.md) | 급여 지급과 환불을 내부 관리자 페이지에서 처리하도록 단독 풀스택 개발 |
| [관리자 화면과 API 개선](platform-operations/admin-improvement.md) | 인터널팀 리드로 기획, API 수정과 관리자 화면의 단계별 전환 지원 |
| [데이터 분석 환경과 대시보드](platform-operations/data-analytics.md) | DS와 데이터 구조를 정하고 분석 환경 구축과 대시보드 집계 방식 개선 |
| [자동 배포](platform-operations/deployment.md) | Bitbucket Pipelines로 개발 자동 배포와 운영 승인 후 배포 구성 |
| [이벤트 공통 코드 정리](platform-operations/event-system.md) | 영업과 마케팅 요청을 반영하고 이벤트 백엔드와 DB 처리 코드를 공통화 |

[TTS 발음 교정과 웹 서비스 유지보수](../experience.md#tts-서비스-기업)

## 사이드 프로젝트

### HR 계약과 현장 운영 SaaS

2025-09 ~ 2025-11, 본업 병행 | [프로젝트 개요](hr-saas/README.md)

| 작업 | 요약 |
| --- | --- |
| [HR 계약과 현장 운영 SaaS MVP 개발](hr-saas/mvp.md) | HR 서비스 PoC의 웹, 서버, DB, 인증과 배포 환경 개발 |

### AI 개발 환경 설정

[프로젝트 개요](ai-development-setup/README.md)

| 작업 | 요약 |
| --- | --- |
| [Codex 코드 검사 설정](ai-development-setup/codex-quality.md) | 개발, 검증과 후속 수정을 연결하는 Codex 공통 스킬과 설치 도구 구성 |
| [Claude Code 작업 규칙과 검증 설정](ai-development-setup/claude-workflow.md) | 요구사항 확인, 개발과 검증 흐름을 재사용하는 Claude Code 설정 구성 |
| [TypeScript 코드 분석용 MCP 연결](ai-development-setup/typescript-graph.md) | 기존 서버 버전을 유지하는 TypeScript 7 기반 MCP 코드 분석 환경 연결 |
