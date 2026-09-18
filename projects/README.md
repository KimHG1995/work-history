# 전체 작업 목록

[전체 안내](../README.md)로 돌아갑니다.

## 회사 프로젝트

### 공공 교육 플랫폼 개발과 운영 개선

2025-11 ~ 현재 | [프로젝트 개요](public-education/README.md)

| 작업 | 요약 |
| --- | --- |
| [예약 메시지 발송 비용 개선](public-education/reservation-messages.md) | 반복 발송 비용을 줄이기 위한 알림톡 전환 제안과 구현 |
| [출결 상태와 단체 인증 처리 개선](public-education/attendance.md) | 출결 상태 변경을 트랜잭션으로 묶고 단체 인증의 병렬 처리와 실패 목록 구현 |
| [예약과 취소의 동시 요청 처리 개선](public-education/reservation.md) | 예약과 취소의 상태 변경, 잔여 인원 갱신을 트랜잭션과 DB 잠금으로 처리 |
| [운영 데이터 집계와 Google Sheets 자동화](public-education/google-sheets-automation.md) | 수동 데이터 정리 업무를 크론으로 자동화하고, 데이터 규모에 따라 애플리케이션 가공과 청크 처리로 18개 Google Sheets 생성 |
| [공공 교육 플랫폼 개발과 운영](public-education/operations.md) | 교육, 예약, 출결, 관리자 기능의 웹과 서버 개발 및 운영 이슈 대응 |

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

### NetBox Cloud Inventory

2026-07 | [프로젝트 개요](netbox-cloud-inventory/README.md)

| 작업 | 요약 |
| --- | --- |
| [멀티클라우드 인프라 자산 관리 PoC 개발](netbox-cloud-inventory/inventory.md) | AWS와 NAVER Cloud Platform Export를 공통 모델로 정규화하고 Preview 승인 후 NetBox에 멱등 반영하는 수동 Import PoC 구현 |

### PaperTrail 전자문서 생성과 증적 플랫폼

2026-07 | [프로젝트 개요](papertrail/README.md)

| 작업 | 요약 |
| --- | --- |
| [전자문서 생성과 증적 플랫폼 개발](papertrail/platform.md) | 멀티테넌트 문서 생성 API와 비동기 렌더, 해시 기반 증적, 재현성 검증, Webhook과 Admin 콘솔 구현 |

### AI 개발 품질 자동화 환경

2026-05 ~ 현재 | [프로젝트 개요](ai-development-setup/README.md)

| 작업 | 요약 |
| --- | --- |
| [Codex 개발 및 검증 루프 자동화](ai-development-setup/codex-quality.md) | 변경 범위에 맞는 검사를 선택하고 문제 수정과 재검증까지 이어가는 품질 루프 구성 |
| [Claude Code 개발 워크플로 자동화](ai-development-setup/claude-workflow.md) | Rules, Skills, Hooks로 요구사항 확인부터 타입 검사와 테스트 피드백까지 연결 |
| [AI용 TypeScript 코드 그래프 분석 환경](ai-development-setup/typescript-graph.md) | 대상 프로젝트 의존성을 변경하지 않고 심볼, 타입과 호출 관계를 MCP로 탐색 |

### loglens API 로그 분석 백엔드

2026-07 | [프로젝트 개요](loglens/README.md)

| 작업 | 요약 |
| --- | --- |
| [API 로그 분석 백엔드 MVP 개발](loglens/mvp.md) | ClickHouse Materialized View로 로그를 사전 집계하고 트래픽, 지연시간, 에러 리포트와 급증 알림 구현 |

### HR 계약과 현장 운영 SaaS

2025-09 ~ 2025-11, 본업 병행 | [프로젝트 개요](hr-saas/README.md)

| 작업 | 요약 |
| --- | --- |
| [HR 계약과 현장 운영 SaaS MVP 개발](hr-saas/mvp.md) | HR 서비스 PoC의 웹, 서버, DB, 인증과 배포 환경 개발 |

