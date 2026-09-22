# NetBox Cloud Inventory

[전체 작업 목록](../README.md)으로 돌아갑니다.

여러 클라우드 계정에 흩어진 서버, 네트워크, IP, 로드밸런서, DNS와 데이터베이스 자산을 공통 모델로 정리하고 NetBox에서 관계 중심으로 조회하기 위한 인프라 자산 관리 사이드 프로젝트입니다.

[코드 저장소](https://github.com/KimHG1995/netbox-cloud-inventory)

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| 프로젝트 구분 | 사이드 |
| 회사 설명 | 해당 없음 |
| 참여 기간 | 2026-07 |
| 맡은 범위 | 인프라 자산 모델 설계, 수동 Export 수집 PoC, 파서와 정규화, 변경 미리보기, NetBox 반영, 안전한 동기화 규칙과 로컬 통합 환경 구성 |

## 작업 목록

| 작업 | 요약 |
| --- | --- |
| [멀티클라우드 인프라 자산 관리 PoC 개발](inventory.md) | AWS와 NAVER Cloud Platform Export를 공통 모델로 정규화하고 Preview 승인 후 NetBox에 멱등 반영하는 수동 Import PoC 구현 |
