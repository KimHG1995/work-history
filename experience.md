# 근무 기록

[전체 안내](README.md)로 돌아갑니다.

## 에듀테크 기업 계열사

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 에듀테크 기업의 계열사 |
| 근무 기간 | 2024-01 ~ 2025-10 |
| 역할 | 백엔드 개발 |
| 직급 | 대리 |
| 사용 언어 | TypeScript |
| 서버 개발 기술 | NestJS, Prisma, Drizzle |
| 데이터 저장 | MySQL, DynamoDB, S3 |
| 메시지 처리와 알림 | AWS SQS, Biztalk, Twilio, SendGrid |
| 프로젝트 화면 기술 | React, Next.js, TailwindCSS, Refine, MUI Pro |

[교육 서비스 작업 목록](projects/education-services/README.md)

- [쿠폰 이벤트 시스템](projects/education-services/promotion.md): 쿠폰 구조를 템플릿과 이벤트 기반으로 바꾸고, 관리자 풀스택 개발과 서버, DB 설계를 맡았습니다.
- [AI 심리검사 서비스 개편](projects/education-services/assessment-renewal.md): Java Spring 서버를 NestJS와 Drizzle로 전환해 여러 서비스가 사용할 공통 서버를 만들고 운영에 배포했습니다.
- [통합 알림 시스템](projects/education-services/notifications.md): 공통 발송과 이력 추적, 배포 자동화를 구현하고 운영 서버에 배포했습니다.
- [교육 연동 서비스 서버 전환과 운영 도구 개발](projects/education-services/art-service-renewal.md): 기존 Java 서버를 동일한 기능 사양으로 전환하고, 인프라와 배포 자동화, 자랑하기 웹과 관리자 페이지를 개발했습니다.
- [개인 고객 서비스 관리자 페이지](projects/education-services/b2c-admin.md): 인수한 프로젝트의 구조를 정리하고 수업, 출석, 사용자 등급 관리 기능을 개발했습니다.
- [개인 고객 수강 앱 서버](projects/education-services/class-app-server.md): 중단된 프로젝트를 인수해 1:1 수업 예약부터 종료와 출결까지 서버 기능을 정리했습니다.

## 단기 구인구직 플랫폼

| 항목 | 내용 |
| --- | --- |
| 회사 설명 | 기업과 개인을 대상으로 단기 구인구직 서비스를 제공하는 플랫폼 기업 |
| 근무 기간 | 2021-07 ~ 2024-01 |
| 역할 | 백엔드 개발, 인터널팀 리드 |
| 서비스 대상 | 기업 대상 서비스(B2B), 개인 대상 서비스(B2C) |
| 서비스 규모 | 최대 월간 이용자 수(MAU) 100만 명 |
| 근무 당시 회사 단계 | 시리즈 A와 B 투자 유치 시기에 근무 |
| 사용 언어 | JavaScript, TypeScript |
| 코드 관리 | Bitbucket |

관리자 업무를 시스템으로 옮기고, 정산과 데이터 분석, 배포와 이벤트 운영 방식을 개선했습니다.
[플랫폼 작업 목록](projects/platform-operations/README.md)

- [초기 관리자 페이지](projects/platform-operations/initial-admin.md): DB, 서버, 화면을 혼자 개발해 실제 운영에 사용했습니다.
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
| 화면 개발 기술 | React, React Admin, MobX |
| 서버 개발 기술 | NestJS, Express, MongoDB |

### TTS 발음 교정

- 시작한 이유: 원하는 음성 데이터를 직접 추출하기 어려워, 입력 글을 바꿔 발음을 교정할 방법이 필요했다.
- 진행 방식: 서버와 DB 개발을 혼자 맡았다.
- 맡은 일: 서버의 발음 교정 로직과 DB에 교정 정보를 저장하고 조회하는 방식을 설계하고 구현했다.
- 처리 방법: 원래 글과 유사한 발음이 나는 글을 짝지어 DB에 저장했다. 음성을 만들 때 저장한 내용을 찾아 입력 글을 바꾸도록 했다.
- 구현한 내용: 같은 발음 교정 규칙을 저장하고 다시 사용할 수 있게 했다.
- 서비스 반영 여부: 반영 완료.

### 웹 서비스 유지보수와 기능 개선

- 화면과 서버의 기능 개선과 유지보수에 참여했다.
- 화면은 React, React Admin, MobX를 사용했다.
- 서버는 NestJS, Express, MongoDB를 사용했다.
- 서비스 반영 여부: 반영 완료.
- 구체적인 수정 내용은 확인 필요.
