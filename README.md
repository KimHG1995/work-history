# 회사 프로젝트와 작업 기록

회사에서 어떤 프로젝트에 참여했고 무엇을 했는지 정리합니다.
작업을 시작한 이유부터 결과와 남은 일까지 기록합니다.

## 찾아보기

- [프로젝트 목록](projects/README.md)
- [기간별 기록](timeline.md)
- [작성 방법](writing-guide.md)
- [프로젝트 양식](templates/project/README.md)

## 기록할 내용

| 항목 | 적을 내용 |
| --- | --- |
| 프로젝트 | 이름, 목적, 관련 저장소 |
| 기간 | 참여 시작일과 종료일 |
| 언어와 기술 | 프로젝트에서 쓰는 기술과 내가 직접 사용한 기술 |
| 시작한 이유 | 이전 상황, 겪은 문제, 바꾸려던 점 |
| 맡은 일 | 내가 맡은 기능과 실제로 한 작업 |
| 함께한 사람 | 이름이나 역할, 나눈 일, 함께 해결한 문제 |
| 구조 | 주요 폴더, 구성 요소, 데이터가 오가는 순서 |
| 현재 상태 | 끝낸 일, 진행 중인 일, 남은 일 |
| 결과 | 바뀐 점, 확인 방법, 관련 커밋과 PR |

## 새 프로젝트 추가

1. `templates/project` 폴더를 `projects/프로젝트이름`으로 복사합니다.
2. 복사한 파일의 대괄호 안 안내를 실제 내용으로 바꿉니다.
3. 프로젝트 소개를 적고, 맡은 작업을 하나씩 정리합니다.
4. [프로젝트 목록](projects/README.md)에 문서 링크를 추가합니다.
5. [기간별 기록](timeline.md)에 참여 기간과 주요 작업을 적습니다.

저장소의 맨 위 폴더에서 다음 명령으로 복사할 수 있습니다.
`my-project`는 실제 프로젝트 이름으로 바꿉니다.

```sh
cp -R templates/project projects/my-project
```

## 파일 구성

```text
work-history/
├── README.md
├── AGENTS.md
├── writing-guide.md
├── timeline.md
├── projects/
│   └── README.md
└── templates/
    └── project/
        ├── README.md
        ├── architecture.md
        ├── contributions.md
        └── history.md
```

프로젝트 폴더의 `README.md`에는 전체 내용을 짧게 적습니다.
`architecture.md`에는 구조를, `contributions.md`에는 내가 한 작업을 적습니다.
`history.md`에는 주요 커밋과 PR을 묶어 정리합니다.

현재는 빈 양식만 준비되어 있습니다. 실제 프로젝트 기록은 아직 추가하지 않았습니다.
