# 프로젝트와 작업 기록

회사 프로젝트와 사이드 프로젝트에서 무엇을 했는지 정리합니다.
작업을 시작한 이유부터 결과와 남은 일까지 기록합니다.

[웹사이트에서 보기](https://kimhg1995.github.io/work-history/)

## 찾아보기

- [근무 기록](experience.md): 회사 설명, 근무 기간, 역할과 주요 작업
- [전체 작업 목록](projects/README.md): 작업별 요약과 상세 문서 링크
- [기간별 기록](timeline.md): 근무 기간과 확인한 작업 기간
- [작성 방법](writing-guide.md): 짧고 쉽게 기록하는 기준
- [프로젝트 개요 양식](templates/project/README.md)
- [작업 양식](templates/task.md)

## 기록 방식

같은 플랫폼이나 프로젝트의 작업은 한 폴더에 모읍니다.
폴더의 `README.md`에는 짧은 소개와 작업 목록을 적습니다.
작업마다 파일 하나에 이유, 역할 분담, 기술, 순서도, 결과와 근거를 함께 적습니다.
짧은 인턴 업무는 근무 기록 안에 둡니다.

회사 이름이나 별칭은 쓰지 않고 어떤 일을 하는 회사인지 설명합니다.
사람 이름은 쓰지 않고 본인과 다른 담당자가 맡은 일을 적습니다.

## 파일 구성

```text
work-history/
├── README.md
├── AGENTS.md
├── experience.md
├── writing-guide.md
├── timeline.md
├── projects/
│   ├── README.md
│   ├── education-services/
│   │   ├── README.md
│   │   ├── promotion.md
│   │   ├── assessment-renewal.md
│   │   ├── notifications.md
│   │   ├── art-service-renewal.md
│   │   ├── b2c-admin.md
│   │   └── class-app-server.md
│   ├── public-education/
│   │   ├── README.md
│   │   ├── reservation-messages.md
│   │   ├── attendance.md
│   │   ├── reservation.md
│   │   ├── google-sheets-automation.md
│   │   └── operations.md
│   ├── ai-development-setup/
│   │   ├── README.md
│   │   ├── codex-quality.md
│   │   ├── claude-workflow.md
│   │   └── typescript-graph.md
│   ├── hr-saas/
│   │   ├── README.md
│   │   └── mvp.md
│   ├── loglens/
│   │   ├── README.md
│   │   └── mvp.md
│   ├── papertrail/
│   │   ├── README.md
│   │   └── platform.md
│   ├── netbox-cloud-inventory/
│   │   ├── README.md
│   │   └── inventory.md
│   └── platform-operations/
│       ├── README.md
│       ├── initial-admin.md
│       ├── settlement.md
│       ├── admin-improvement.md
│       ├── data-analytics.md
│       ├── deployment.md
│       └── event-system.md
└── templates/
    ├── task.md
    └── project/
        └── README.md
```

## 새 작업 추가

1. 새 프로젝트 묶음이면 `templates/project` 폴더를 `projects/프로젝트이름`으로 복사합니다.
2. `templates/task.md`를 해당 폴더에 작업 이름으로 복사합니다.
3. 양식 안내를 실제 내용으로 바꾸고, 프로젝트 개요로 돌아가는 링크를 연결합니다.
4. 프로젝트 개요와 [전체 작업 목록](projects/README.md)에 짧은 요약과 링크를 추가합니다.
5. [근무 기록](experience.md)에는 주요 작업 링크를, [기간별 기록](timeline.md)에는 확인한 기간을 적습니다.

저장소의 맨 위 폴더에서 아래 명령으로 시작할 수 있습니다.
`my-project`와 `my-task`는 실제 프로젝트와 작업에 맞게 바꿉니다.

```sh
cp -R templates/project projects/my-project
cp templates/task.md projects/my-project/my-task.md
```

구체적인 설명을 고칠 때는 해당 작업 파일을 수정합니다.
근무 기록과 목록에는 같은 설명을 길게 복사하지 않습니다.

## 웹사이트 관리

기존 Markdown을 수정하고 `main`에 푸시하면 GitHub Pages가 자동으로 갱신됩니다.
근무 기록, 기간별 기록, 프로젝트 문서가 웹에 표시됩니다.
새 프로젝트 폴더와 작업 파일은 메뉴에 자동으로 추가됩니다.

로컬에서 확인할 때는 아래 명령을 사용합니다.

```sh
npm ci
npm run docs:dev
```

배포 파일은 `npm run docs:build`로 생성합니다.
`site/content`는 자동 생성 폴더이므로 원본 Markdown을 수정합니다.
