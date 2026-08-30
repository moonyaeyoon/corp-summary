# Reports API Design

## Purpose

이 문서는 `corp-summary` 백엔드에서 구현해야 할 실적 집계 API와 설계 항목을 정리한다.

실적 기능의 화면 흐름은 다음과 같다.

1. 사용자가 실적 이름을 입력해 리포트 항목을 만든다.
2. 사용자가 전주 기준일과 이번주 기준일을 선택한다.
3. 사용자가 `집계 시작`을 누른다.
4. Summary 탭에는 집계 결과 표가 나온다.
5. 거래 내역, 온보딩, 잔고 탭은 사용자가 탭을 눌렀을 때 이번주 기준일까지의 상세 리스트를 조회한다.

## Backend Directory Target

백엔드 코드는 아래 위치에 구현한다.

```txt
corp-summary/apps/server/src
```

권장 구조는 다음과 같다.

```txt
src/
├─ main.ts
├─ app.module.ts
├─ config/
│  ├─ env.config.ts
│  ├─ database.config.ts
│  └─ swagger.config.ts
├─ utils/
│  ├─ date.util.ts
│  ├─ number.util.ts
│  └─ pagination.util.ts
├─ database/
│  ├─ database.module.ts
│  └─ database.service.ts
├─ reports/
│  ├─ reports.controller.ts
│  ├─ reports.service.ts
│  ├─ reports.module.ts
│  ├─ reports.entity.ts
│  ├─ reports.repository.ts
│  └─ dto/
│     ├─ create-report.dto.ts
│     ├─ update-report-dates.dto.ts
│     └─ run-report.dto.ts
├─ transactions/
│  ├─ transactions.controller.ts
│  ├─ transactions.service.ts
│  ├─ transactions.module.ts
│  ├─ transactions.entity.ts
│  └─ transactions.repository.ts
├─ onboarding/
│  ├─ onboarding.controller.ts
│  ├─ onboarding.service.ts
│  ├─ onboarding.module.ts
│  ├─ onboarding.entity.ts
│  └─ onboarding.repository.ts
└─ balances/
   ├─ balances.controller.ts
   ├─ balances.service.ts
   ├─ balances.module.ts
   ├─ balances.entity.ts
   └─ balances.repository.ts
```

## Initial Setup Tasks

처음 세팅할 항목은 다음과 같다.

| Task | Description |
| --- | --- |
| Swagger | `/docs`에서 API 문서를 볼 수 있게 설정한다. |
| DB config | 환경변수 기반으로 DB 연결을 설정한다. |
| ValidationPipe | DTO validation을 전역으로 적용한다. |
| CORS | 프론트 `apps/web` 주소를 허용한다. |
| API prefix | 모든 API 앞에 `/v1` prefix를 붙인다. |
| Pagination util | 상세 리스트 API에서 cursor 또는 limit 기반 조회를 공통 처리한다. |

## Source Tables

### `myy_corp_balance_mv`

잔고 또는 예치금 탭과 Summary 예치금 계산에 사용한다.

| Column | Type | Description |
| --- | --- | --- |
| `basis_dt` | `varchar(50)` | 집계 날짜 |
| `cust_id` | `varchar(50)` | 고객ID |
| `mem_id` | `varchar(50)` | 회원ID |
| `account_status` | `varchar(100)` | 계정상태 |
| `kyc_status` | `varchar(100)` | 고객확인상태 |
| `corp_nm` | `varchar(300)` | 법인이름 |
| `market_stage` | `varchar(100)` | 시장참여단계 |
| `corp_type` | `varchar(200)` | 법인유형 |
| `is_core` | `varchar(1)` | core여부 |
| `coin_symbol_nm` | `varchar(50)` | 코인심볼명 |
| `coin_qty` | `numeric(38,18)` | 코인수량 |
| `balance_krw_amt` | `numeric(38,18)` | 원화환산잔고 |

### `myy_corp_transaction_mv`

거래 내역 탭과 Summary 거래대금 계산에 사용한다.

| Column | Type | Description |
| --- | --- | --- |
| `transaction_type` | `varchar(20)` | 구분. 매수, 매도, 코인입금, 코인출금 |
| `inout_type` | `varchar(20)` | 입출금구분. 외부입금, 외부출금, 내부입금, 내부출금 |
| `account_status` | `varchar(100)` | 계정상태 |
| `corp_nm` | `varchar(300)` | 법인이름 |
| `cust_id` | `varchar(50)` | 고객ID |
| `mem_id` | `varchar(50)` | 회원ID |
| `market_stage` | `varchar(100)` | 시장참여단계 |
| `corp_type` | `varchar(200)` | 법인유형 |
| `coin_symbol_nm` | `varchar(2000)` | 코인심볼명 |
| `transaction_dtm` | `timestamp` | 거래날짜 |
| `coin_qty` | `numeric(38,18)` | 코인수량 |
| `krw_amt` | `numeric(38,18)` | 원화환산거래금액 |
| `basis_dt` | `date` | 거래날짜 |
| `is_core` | `varchar(1)` | core여부 |

### `myy_corp_member_dim`

온보딩 탭과 Summary 온보딩 계산에 사용한다.

| Column | Type | Description |
| --- | --- | --- |
| `cust_id` | `varchar(50)` | 고객ID |
| `mem_id` | `varchar(50)` | 회원ID |
| `corp_nm` | `varchar(300)` | 법인이름 |
| `account_status` | `varchar(100)` | 계정상태 |
| `kyc_status` | `varchar(100)` | 고객확인상태 |
| `market_stage` | `varchar(100)` | 시장참여단계 |
| `corp_market_type` | `varchar(200)` | 법인유형 |
| `corp_type` | `varchar(200)` | 보조 법인유형 |
| `is_core` | `varchar(1)` | core여부 |
| `member_join_dtm` | `timestamp` | 가입날짜 |
| `mem_leave_dtm` | `timestamp` | 탈퇴날짜 |
| `first_kyc_dtm` | `timestamp` | 최초고객확인날짜 |
| `latest_kyc_dtm` | `timestamp` | 마지막고객확인날짜 |
| `next_kyc_dtm` | `timestamp` | 다음고객확인날짜 |
| `is_onboarding_target` | `varchar(1)` | 온보딩타겟여부 |
| `loaded_at` | `timestamp` | 적재날짜 |

## Core Calling Strategy

집계 시작 시 모든 상세 데이터를 한 번에 내려주지 않는다.

권장 호출 전략은 다음과 같다.

```txt
1. POST /v1/reports
   리포트 이름 생성

2. PATCH /v1/reports/{reportId}/dates
   전주 기준일, 이번주 기준일 저장

3. POST /v1/reports/{reportId}/run
   Summary 탭용 집계 결과만 생성하고 반환

4. GET /v1/reports/{reportId}/transactions
   거래 내역 탭 클릭 시 lazy loading

5. GET /v1/reports/{reportId}/onboarding
   온보딩 탭 클릭 시 lazy loading

6. GET /v1/reports/{reportId}/balances
   잔고 탭 클릭 시 lazy loading
```

이 전략을 쓰는 이유는 상세 리스트 row가 많아질 수 있기 때문이다. Summary는 작은 집계 결과이므로 `run` 응답에 포함하고, 거래 내역/온보딩/잔고 상세는 탭을 열 때 필요한 만큼만 페이지네이션으로 가져온다.

## API List

### 1. Create Report

```http
POST /v1/reports
```

리포트 이름을 생성한다. 생성된 리포트는 사이드바 `실적 집계` 하위 항목으로 표시한다.

#### Request

```json
{
  "name": "08.21 실적"
}
```

#### Response `201`

```json
{
  "id": "rpt_001",
  "name": "08.21 실적",
  "status": "DRAFT",
  "previousDate": null,
  "currentDate": null,
  "createdAt": "2026-08-30T12:00:00+09:00",
  "updatedAt": "2026-08-30T12:00:00+09:00"
}
```

### 2. List Reports

```http
GET /v1/reports?limit=20&cursor={cursor}
```

사이드바에 표시할 리포트 목록을 조회한다.

#### Response `200`

```json
{
  "items": [
    {
      "id": "rpt_001",
      "name": "08.21 실적",
      "status": "COMPLETED",
      "previousDate": "2026-08-14",
      "currentDate": "2026-08-21",
      "createdAt": "2026-08-30T12:00:00+09:00",
      "updatedAt": "2026-08-30T12:30:00+09:00"
    }
  ],
  "nextCursor": null
}
```

### 3. Update Report Dates

```http
PATCH /v1/reports/{reportId}/dates
```

전주 기준일과 이번주 기준일을 저장한다.

#### Request

```json
{
  "previousDate": "2026-08-14",
  "currentDate": "2026-08-21"
}
```

#### Validation

- `previousDate`와 `currentDate`는 `YYYY-MM-DD` 형식이어야 한다.
- `previousDate`는 `currentDate`보다 이전 날짜여야 한다.

#### Response `200`

```json
{
  "id": "rpt_001",
  "name": "08.21 실적",
  "status": "DRAFT",
  "previousDate": "2026-08-14",
  "currentDate": "2026-08-21",
  "updatedAt": "2026-08-30T12:10:00+09:00"
}
```

### 4. Run Report Aggregation

```http
POST /v1/reports/{reportId}/run
```

`집계 시작` 버튼 클릭 시 호출한다. 이 API는 Summary 탭에 필요한 데이터만 반환한다.

#### Response `200`

```json
{
  "report": {
    "id": "rpt_001",
    "name": "08.21 실적",
    "status": "COMPLETED",
    "previousDate": "2026-08-14",
    "currentDate": "2026-08-21",
    "generatedAt": "2026-08-30T12:30:00+09:00"
  },
  "sourceDates": {
    "previousBalanceBasisDate": "2026-08-14",
    "currentBalanceBasisDate": "2026-08-21"
  },
  "summaryTable": {
    "title": "이번주 실적",
    "previousLabel": "실적 (2026.08.14 기준)",
    "currentLabel": "실적 (2026.08.21 기준)",
    "rows": [
      {
        "corpType": "1단계 (국가지자체 등)",
        "targetGroup": "-",
        "previous": {
          "onboardingCount": 1,
          "balanceKrw": 0,
          "transactionKrw": 857224
        },
        "current": {
          "onboardingCount": 71,
          "balanceKrw": 68822,
          "transactionKrw": 3757171910
        }
      }
    ]
  },
  "comparisonTable": {
    "title": "전주대비",
    "unit": {
      "balanceKrw": "MILLION_KRW",
      "transactionKrw": "MILLION_KRW"
    },
    "rows": [
      {
        "label": "2026.08.14",
        "total": 221,
        "stage1": 73,
        "stage2": 35,
        "stage3": 108,
        "etc": 5,
        "balanceMillionKrw": 5031,
        "transactionMillionKrw": 9290
      },
      {
        "label": "2026.08.21",
        "total": 221,
        "stage1": 73,
        "stage2": 35,
        "stage3": 108,
        "etc": 5,
        "balanceMillionKrw": 4944,
        "transactionMillionKrw": 9290
      },
      {
        "label": "대비증감",
        "total": 0,
        "stage1": 0,
        "stage2": 0,
        "stage3": 0,
        "etc": 0,
        "balanceMillionKrw": -87,
        "transactionMillionKrw": 0,
        "isDiff": true
      }
    ]
  },
  "sentenceSummary": {
    "title": "문장요약",
    "lines": [
      "법인 고객 주간 실적 221개사, 전주대비 +0",
      "온보딩: 전체 221개사, 2단계 35개사",
      "예치금: 4,944백만원 (-87)",
      "거래대금: 9,290백만원 (+0)"
    ]
  }
}
```

### 5. Get Report Summary

```http
GET /v1/reports/{reportId}/summary
```

리포트 상세 화면 진입 또는 새로고침 시 Summary 탭 데이터를 다시 조회한다.

응답 구조는 `POST /v1/reports/{reportId}/run`과 동일하다.

### 6. Get Report Transactions

```http
GET /v1/reports/{reportId}/transactions?limit=50&cursor={cursor}
```

거래 내역 탭에서 이번주 기준일까지의 누적 거래내역을 조회한다.

#### Data Rule

```sql
basis_dt <= report.currentDate
```

#### Response Shape

```json
{
  "report": {
    "id": "rpt_001",
    "name": "08.21 실적",
    "currentDate": "2026-08-21"
  },
  "basis": {
    "type": "CUMULATIVE_UNTIL_CURRENT_DATE",
    "currentDate": "2026-08-21"
  },
  "columns": [
    { "key": "transaction_type", "label": "구분", "dataType": "varchar(20)" },
    { "key": "inout_type", "label": "입출금구분", "dataType": "varchar(20)" },
    { "key": "account_status", "label": "계정상태", "dataType": "varchar(100)" },
    { "key": "corp_nm", "label": "법인이름", "dataType": "varchar(300)" },
    { "key": "cust_id", "label": "고객ID", "dataType": "varchar(50)" },
    { "key": "mem_id", "label": "회원ID", "dataType": "varchar(50)" },
    { "key": "market_stage", "label": "시장참여단계", "dataType": "varchar(100)" },
    { "key": "corp_type", "label": "법인유형", "dataType": "varchar(200)" },
    { "key": "coin_symbol_nm", "label": "코인심볼명", "dataType": "varchar(2000)" },
    { "key": "transaction_dtm", "label": "거래날짜", "dataType": "timestamp" },
    { "key": "coin_qty", "label": "코인수량", "dataType": "numeric(38,18)" },
    { "key": "krw_amt", "label": "원화환산거래금액", "dataType": "numeric(38,18)" },
    { "key": "basis_dt", "label": "거래날짜", "dataType": "date" },
    { "key": "is_core", "label": "core여부", "dataType": "varchar(1)" }
  ],
  "items": [],
  "page": {
    "limit": 50,
    "nextCursor": null
  }
}
```

### 7. Get Report Onboarding

```http
GET /v1/reports/{reportId}/onboarding?limit=50&cursor={cursor}
```

온보딩 탭에서 이번주 기준일까지의 누적 온보딩 리스트를 조회한다.

온보딩 기준은 추후 확정한다. API 응답 구조는 기준이 바뀌어도 유지한다.

#### Expected Data Rule

```sql
member_join_dtm <= report.currentDate
```

#### Response Shape

```json
{
  "report": {
    "id": "rpt_001",
    "name": "08.21 실적",
    "currentDate": "2026-08-21"
  },
  "basis": {
    "type": "CUMULATIVE_UNTIL_CURRENT_DATE",
    "currentDate": "2026-08-21"
  },
  "columns": [
    { "key": "cust_id", "label": "고객ID", "dataType": "varchar(50)" },
    { "key": "mem_id", "label": "회원ID", "dataType": "varchar(50)" },
    { "key": "corp_nm", "label": "법인이름", "dataType": "varchar(300)" },
    { "key": "account_status", "label": "계정상태", "dataType": "varchar(100)" },
    { "key": "kyc_status", "label": "고객확인상태", "dataType": "varchar(100)" },
    { "key": "market_stage", "label": "시장참여단계", "dataType": "varchar(100)" },
    { "key": "corp_market_type", "label": "법인유형", "dataType": "varchar(200)" },
    { "key": "corp_type", "label": "corp_type", "dataType": "varchar(200)" },
    { "key": "is_core", "label": "core여부", "dataType": "varchar(1)" },
    { "key": "member_join_dtm", "label": "가입날짜", "dataType": "timestamp" },
    { "key": "mem_leave_dtm", "label": "탈퇴날짜", "dataType": "timestamp" },
    { "key": "first_kyc_dtm", "label": "최초고객확인날짜", "dataType": "timestamp" },
    { "key": "latest_kyc_dtm", "label": "마지막고객확인날짜", "dataType": "timestamp" },
    { "key": "next_kyc_dtm", "label": "다음고객확인날짜", "dataType": "timestamp" },
    { "key": "is_onboarding_target", "label": "온보딩타겟여부", "dataType": "varchar(1)" },
    { "key": "loaded_at", "label": "적재날짜", "dataType": "timestamp" }
  ],
  "items": [],
  "page": {
    "limit": 50,
    "nextCursor": null
  }
}
```

### 8. Get Report Balances

```http
GET /v1/reports/{reportId}/balances?limit=50&cursor={cursor}
```

잔고 탭에서 이번주 기준일의 예치금 상세 리스트를 조회한다.

#### Data Rule

`myy_corp_balance_mv`는 일별 잔고 스냅샷이다. 따라서 `basis_dt <= currentDate` 전체를 합산하면 같은 잔고가 날짜별로 중복 집계될 수 있다.

잔고 상세 리스트는 아래 기준을 사용한다.

```sql
basis_dt = currentBalanceBasisDate
```

`currentBalanceBasisDate`는 `report.currentDate` 이하의 가장 최근 `basis_dt`이다.

#### Response Shape

```json
{
  "report": {
    "id": "rpt_001",
    "name": "08.21 실적",
    "currentDate": "2026-08-21"
  },
  "basis": {
    "type": "LATEST_SNAPSHOT_UNTIL_CURRENT_DATE",
    "currentDate": "2026-08-21",
    "balanceBasisDate": "2026-08-21"
  },
  "columns": [
    { "key": "basis_dt", "label": "집계 날짜", "dataType": "varchar(50)" },
    { "key": "cust_id", "label": "고객ID", "dataType": "varchar(50)" },
    { "key": "mem_id", "label": "회원ID", "dataType": "varchar(50)" },
    { "key": "account_status", "label": "계정상태", "dataType": "varchar(100)" },
    { "key": "kyc_status", "label": "고객확인상태", "dataType": "varchar(100)" },
    { "key": "corp_nm", "label": "법인이름", "dataType": "varchar(300)" },
    { "key": "market_stage", "label": "시장참여단계", "dataType": "varchar(100)" },
    { "key": "corp_type", "label": "법인유형", "dataType": "varchar(200)" },
    { "key": "is_core", "label": "core여부", "dataType": "varchar(1)" },
    { "key": "coin_symbol_nm", "label": "코인심볼명", "dataType": "varchar(50)" },
    { "key": "coin_qty", "label": "코인수량", "dataType": "numeric(38,18)" },
    { "key": "balance_krw_amt", "label": "원화환산잔고", "dataType": "numeric(38,18)" }
  ],
  "items": [],
  "page": {
    "limit": 50,
    "nextCursor": null
  }
}
```

## Persistence Design

Summary 결과는 리포트별로 저장한다. 상세 리스트는 저장하지 않고 탭 클릭 시 원천 MV/table에서 조회한다.

### `reports`

| Column | Description |
| --- | --- |
| `id` | 리포트 ID |
| `name` | 리포트 이름 |
| `status` | `DRAFT`, `RUNNING`, `COMPLETED`, `FAILED` |
| `previous_date` | 전주 기준일 |
| `current_date` | 이번주 기준일 |
| `created_at` | 생성일시 |
| `updated_at` | 수정일시 |

### `report_results`

| Column | Description |
| --- | --- |
| `id` | 결과 ID |
| `report_id` | 리포트 ID |
| `summary_table_json` | Summary 첫 번째 표 결과 |
| `comparison_table_json` | 전주대비 표 결과 |
| `sentence_summary_json` | 문장요약 결과 |
| `source_dates_json` | 실제 사용한 기준일 정보 |
| `created_at` | 생성일시 |

## Numeric Response Rule

Summary의 집계 숫자는 `number`로 내려준다. 프론트는 콤마, 원, 백만원, 증감 색상을 처리한다.

상세 리스트의 `numeric(38,18)` 원천 값은 정밀도 손실을 피하기 위해 문자열로 내려주는 것을 권장한다.

```json
{
  "coin_qty": "10.000000000000000000",
  "krw_amt": "5003308311.000000000000000000"
}
```

## Error Response Format

모든 에러는 같은 형태로 내려준다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "previousDate must be earlier than currentDate",
    "field": "previousDate"
  }
}
```

## Error Codes

| HTTP Status | Code | Description |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 요청 값 검증 실패 |
| `400` | `REPORT_DATE_REQUIRED` | 집계에 필요한 기준일 없음 |
| `404` | `REPORT_NOT_FOUND` | 리포트 없음 |
| `409` | `REPORT_ALREADY_RUNNING` | 이미 집계 중인 리포트 재실행 |
| `500` | `REPORT_AGGREGATION_FAILED` | 집계 실패 |

## Implementation Order

권장 구현 순서는 다음과 같다.

1. Swagger, Config, DB 연결 세팅
2. `reports` 모듈 생성
3. `POST /reports`, `GET /reports`, `PATCH /reports/{id}/dates` 구현
4. `POST /reports/{id}/run`, `GET /reports/{id}/summary` mock 응답 구현
5. `transactions`, `onboarding`, `balances` 리스트 API mock 응답 구현
6. 프론트와 API contract 연결
7. mock repository를 실제 SQL 조회로 교체
8. Summary 집계 산식 확정 후 SQL 구현
9. 온보딩 산식 확정 후 Summary와 onboarding list 필터에 반영

## Open Decisions

아직 확정이 필요한 항목은 다음과 같다.

| Topic | Decision Needed |
| --- | --- |
| 온보딩 기준 | `member_join_dtm`, `kyc_status`, `is_onboarding_target` 중 어떤 조합을 사용할지 확정 필요 |
| 시장참여단계 매핑 | Summary 표의 1단계, 2단계, 3단계, 기타 분류 기준 확정 필요 |
| 예치금 음수 처리 | 음수 잔고를 그대로 표시할지, 0 처리할지 확정 필요 |
| 거래대금 범위 | 선택 날짜까지 전체 누적인지, 특정 시작일 이후 누적인지 최종 확인 필요 |
| 인증 | 관리자 인증/인가 적용 여부 결정 필요 |
| Excel 다운로드 | Summary만 다운로드할지, 탭별 상세도 다운로드할지 결정 필요 |
