# 근무 기록

[전체 안내](README.md)로 돌아갑니다.

## 공공 교육 서비스 기업

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 공공기관 대상 교육 플랫폼 개발 및 운영 기업 |
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

- [예약 메시지 발송 비용 개선](projects/public-education/reservation-messages.md): LMS 안내 메시지의 알림톡 전환 및 운영 적용
- [출결 상태와 단체 인증 처리 개선](projects/public-education/attendance.md): 출결 변경에 트랜잭션 적용, 단체 인증 병렬 처리와 실패 목록 분리.
- [예약과 취소의 동시 요청 처리 개선](projects/public-education/reservation.md): 트랜잭션과 DB 잠금으로 예약 상태와 잔여 인원 변경 처리.
- [운영 데이터 집계와 Google Sheets 자동화](projects/public-education/google-sheets-automation.md): 수동 운영 데이터 정리 업무 분석 및 자동화 제안, Google Sheets 18개 시트의 집계와 이관 자동화
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

- [쿠폰 이벤트 시스템](projects/education-services/promotion.md): 여러 판매처의 구매 정보 연동, 템플릿 기반 쿠폰 발급 및 관리자 페이지 풀스택 개발, 서버와 DB 설계
- [AI 심리검사 서비스 개편](projects/education-services/assessment-renewal.md): Java Spring 서버를 NestJS와 Drizzle 기반 공통 서버로 전환하고 운영 배포
- [통합 알림 시스템](projects/education-services/notifications.md): 서비스별 알림 발송 기능 통합, 발송 이력 추적 및 배포 자동화 구현과 운영 반영
- [계열사 연동 서비스 서버 재구성과 관리자 페이지 개발](projects/education-services/art-service-renewal.md): 기존 기능을 유지하며 Java 서버를 NestJS로 재구성, 인프라 및 배포 자동화와 웹·관리자 페이지 개발
- [개인 고객 서비스 관리자 페이지](projects/education-services/b2c-admin.md): 관련 부서와 요구사항 협의, 관리자 페이지 풀스택 개발 및 기능 추가와 유지보수
- [개인 고객 수강 앱 서버](projects/education-services/class-app-server.md): 선임 개발자의 DB 및 아키텍처 설계 지원, 신규 서버 개발과 수강 데이터 및 콘텐츠 마이그레이션

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

수기 관리자 업무의 시스템 전환, 정산과 환불 기능 개발, 데이터 분석 환경 및 배포·이벤트 운영 방식 개선
[플랫폼 작업 목록](projects/platform-operations/README.md)

- [관리자 페이지 개발과 기능 추가](projects/platform-operations/initial-admin.md): 초기 관리자 페이지 단독 개발 및 재직 기간 중 풀스택 기능 확장
- [급여 정산과 환불](projects/platform-operations/settlement.md): 약 한 달간 급여 지급 및 환불 기능 단독 개발, 내부 관리자 페이지에 적용
- [관리자 화면과 API 개선](projects/platform-operations/admin-improvement.md): 관리자 화면 개선 기획과 API 수정, 프론트엔드의 단계별 전환 지원
- [데이터 분석 환경과 대시보드](projects/platform-operations/data-analytics.md): DS와 데이터 구조 협의, 분석 환경 구성 및 대시보드 집계 방식 개선
- [자동 배포](projects/platform-operations/deployment.md): 선임 개발자가 구성한 배포 환경에 맞춰 Bitbucket Pipelines 작성
- [이벤트 공통 코드 정리](projects/platform-operations/event-system.md): 영업·마케팅 요구사항 정리, 백엔드 및 DB 개발과 이벤트 공통 코드 개선

## TTS 서비스 기업

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 텍스트를 음성으로 변환해 영상 및 교육 자료 제작을 지원하는 외국계 기업 |
| 근무 기간 | 2020-12 ~ 2021-06 (6개월) |
| 역할 | 인턴 |
| 주요 분야 | TTS(텍스트 음성 변환) |
| 맡은 업무 | TTS 발음 교정 기능 개발, 웹 서비스 유지보수와 기능 개선 |
| 사용 언어 | TypeScript |
| 프론트엔드 | React, React Admin, MobX |
| 백엔드 | NestJS, Express |
| 데이터베이스 | MongoDB |

### TTS 발음 교정

- 배경: 원하는 음성 데이터를 직접 추출하기 어려워 텍스트 기반 발음 교정 기능 필요
- 담당: 발음 교정 서버 로직 및 DB 설계·개발 전담
- 구현: 원본 텍스트와 유사 발음 텍스트를 매핑해 저장하고, 음성 합성 요청 시 매핑 정보를 조회해 입력 텍스트 치환
- 결과: 발음 교정 규칙의 저장과 재사용 기능 구현, 운영 반영

### 웹 서비스 유지보수와 기능 개선

- React, React Admin, MobX 기반 화면 기능 개선 및 유지보수 참여
- NestJS, Express, MongoDB 기반 서버 기능 개선 및 유지보수 참여
- 운영 상태: 운영 중

## 사이드 프로젝트

[PaperTrail 전자문서 생성과 증적 플랫폼](projects/papertrail/README.md)

- [전자문서 생성과 증적 플랫폼 개발](projects/papertrail/platform.md): 멀티테넌트 문서 생성 API, 비동기 렌더링, 해시 기반 증적과 재현성 검증, Webhook 및 운영 관리자 기능 구현

[AI 개발 품질 자동화 환경](projects/ai-development-setup/README.md)

- [Codex 개발 및 검증 루프 자동화](projects/ai-development-setup/codex-quality.md): 코드 변경 범위에 맞는 검사 선택, 실패 수정과 재검증을 반복하는 개발 품질 검증 환경 구축
- [Claude Code 개발 워크플로 자동화](projects/ai-development-setup/claude-workflow.md): Rules, Skills, Hooks 기반 요구사항 확인, 편집 안전장치, 타입 검사 및 테스트 피드백 연결
- [AI용 TypeScript 코드 그래프 분석 환경](projects/ai-development-setup/typescript-graph.md): 대상 프로젝트의 의존성 변경 없이 함수 호출과 타입 관계를 MCP로 탐색하는 외부 분석 환경 구축

[loglens API 로그 분석 백엔드](projects/loglens/README.md)

- [API 로그 분석 백엔드 MVP 개발](projects/loglens/mvp.md): ClickHouse Materialized View 기반 API 로그 사전 집계, 트래픽·응답시간·오류 리포트 및 급증 알림 구현

[NetBox Cloud Inventory](projects/netbox-cloud-inventory/README.md)

- [멀티클라우드 인프라 자산 관리 PoC 개발](projects/netbox-cloud-inventory/inventory.md): 여러 AWS 및 NAVER Cloud Platform 계정의 자산 정보를 공통 모델로 정규화하고, 미리보기 승인 후 NetBox 반영 흐름 구현

[HR 계약과 현장 운영 SaaS](projects/hr-saas/README.md)

- [HR 계약과 현장 운영 SaaS MVP 개발](projects/hr-saas/mvp.md): 2025-09 ~ 2025-11 본업과 병행해 관리자·사용자 웹, 서버, DB, 인증, 스토리지 및 배포 환경 개발
