# schema.md — Corporate Weekly Summary / Natural-Language SQL

이 문서는 로컬 LLM이 **현재 법인 실적 플랫폼의 조회 구조**를 이해하고 SQL을 생성할 때 사용하는 스키마 문서다.

기준:
- 사용자 제공 최신 SQL 3개
  - `corp_member_dim`
  - `myy_corp_transaction_mv`
  - `myy_corp_balance_mv`
- Weekly Summary 화면
- 현재 집계 기준
- 이전 guide/schema 규칙은 사용하지 않는다.

---

# 0. 현재 조회 구조

가능하면 자연어 조회에서는 아래 `analysis` 계층을 우선 사용한다.

```text
analysis.myy_corp_member_dim
        ├── 1 : N ── analysis.myy_corp_transaction_mv
        └── 1 : N ── analysis.myy_corp_balance_mv
```

원천 테이블은 `bitmart` / 일부 `ods` 테이블이다.

> IMPORTANT
>
> 업로드된 `corp_member_dim` SQL의 INSERT 대상은 `analysis.corp_member_dim`인데,
> transaction/balance MV SQL에서는 `analysis.myy_corp_member_dim`을 참조하고 있다.
>
> 실제 운영 테이블명을 하나로 통일해야 한다.
> 이 문서에서는 transaction/balance MV와의 일관성을 위해
> **`analysis.myy_corp_member_dim`을 canonical name으로 사용한다.**

---

# 1. analysis.myy_corp_member_dim

법인 단위 Dimension.

한 법인의 기본 정보, 계정 상태, KYC 상태, 시장단계, 법인유형,
Core 여부, 가입/탈퇴일, 최초/최근 KYC 일자 등을 제공한다.

## Columns

| 컬럼 | 의미 |
|---|---|
| `cust_id` | 법인 고객 ID |
| `mem_id` | 회원 ID |
| `corp_nm` | 법인명 |
| `account_status` | 계정 상태 |
| `kyc_status` | 고객확인 상태 |
| `market_stage` | 시장 참여 단계 |
| `corp_market_type` | 시장 기준 법인 유형 |
| `corp_type` | 법인 유형 |
| `is_core` | Core 법인 여부 (`Y` / `N`) |
| `member_join_dtm` | 회원 가입일시 |
| `mem_leave_dtm` | 회원 탈퇴일시 |
| `first_kyc_dtm` | 최초 KYC 완료일시 |
| `latest_kyc_dtm` | 최근 KYC 완료일시 |
| `next_kyc_dtm` | 다음 KYC 예정일시 |
| `is_onboarding_target` | 상태 기준 온보딩 대상 여부 |
| `loaded_at` | Dimension 적재 시각 |

## 주요 값

### account_status

```text
활성화계정
휴면계정
탈퇴계정
제휴계정
```

### kyc_status

```text
고객확인완료
고객확인전단계
```

### market_stage

```text
1단계
2단계
3단계
기타
```

## 온보딩 집계 시 주의

`is_onboarding_target='Y'`만으로는 최종 집계 조건이 완성되지 않는다.

최종 온보딩 대상 조건은 반드시 다음을 적용한다.

```sql
(
    account_status = '활성화계정'
    AND kyc_status = '고객확인완료'
)
OR
(
    account_status = '휴면계정'
    AND kyc_status = '고객확인전단계'
)
```

그리고:

```sql
latest_kyc_dtm >= TIMESTAMP '2025-01-01 00:00:00'
```

기준일 D 시점 집계라면 미래 KYC가 들어가지 않도록:

```sql
latest_kyc_dtm < DATEADD(day, 1, :basis_date)
```

까지 적용한다.

법인 수는 `COUNT(DISTINCT cust_id)`를 사용한다.

---

# 2. analysis.myy_corp_transaction_mv

법인 거래/입출금 통합 Materialized View.

매수, 매도, 코인입금, 코인출금을 동일한 구조로 제공한다.

## Columns

| 컬럼 | 의미 |
|---|---|
| `transaction_type` | 거래 유형 (`매수`, `매도`, `코인입금`, `코인출금`) |
| `inout_type` | 내부/외부 입출금 구분 |
| `account_status` | 계정 상태 |
| `corp_nm` | 법인명 |
| `cust_id` | 법인 고객 ID |
| `mem_id` | 회원 ID |
| `market_stage` | 시장 참여 단계 |
| `corp_market_type` | 시장 기준 법인 유형 |
| `coin_symbol_nm` | 코인 심볼 |
| `transaction_dtm` | 거래 발생 일시 |
| `coin_qty` | 코인 수량 |
| `krw_amt` | 원화 기준 금액 |
| `basis_dt` | 거래 기준일 |
| `is_core` | Core 여부 |

## transaction_type

```text
매수
매도
코인입금
코인출금
```

## inout_type

입금:

```text
외부입금
내부입금
```

출금:

```text
외부출금
내부출금
```

매수/매도:

```text
NULL
```

## 거래대금 집계

거래대금에는 **매수와 매도만 포함**한다.

```sql
transaction_type IN ('매수', '매도')
```

누적 시작일:

```sql
transaction_dtm >= TIMESTAMP '2025-01-01 00:00:00'
```

기준일 D까지 누적:

```sql
transaction_dtm < DATEADD(day, 1, :basis_date)
```

금액:

```sql
SUM(krw_amt)
```

코인입금/코인출금은 거래대금에 포함하지 않는다.

---

# 3. analysis.myy_corp_balance_mv

법인별 일자별 가상자산 잔고 Materialized View.

## Columns

| 컬럼 | 의미 |
|---|---|
| `basis_dt` | 잔고 Snapshot 기준일 |
| `cust_id` | 법인 고객 ID |
| `mem_id` | 회원 ID |
| `account_status` | 계정 상태 |
| `kyc_status` | KYC 상태 |
| `corp_nm` | 법인명 |
| `market_stage` | 시장 참여 단계 |
| `corp_market_type` | 시장 기준 법인 유형 |
| `is_core` | Core 여부 |
| `coin_symbol_nm` | 코인 심볼 |
| `coin_qty` | 보유 수량 |
| `balance_krw_amt` | 원화 환산 잔고 |

## MV 자체의 필터

업로드된 MV 정의상 다음 데이터만 포함한다.

```sql
account_status = '활성화계정'
balance_krw_amt > 0
coin_symbol_nm <> 'KRW'
coin_symbol_nm <> 'P'
```

또한 해당 법인이 `2025-01-01` 이후 KYC 완료 이력이 존재해야 한다.

## 예치금 집계

예치금은 **Snapshot** 데이터다.

반드시 집계하려는 기준 날짜와 동일한 `basis_dt`만 사용한다.

```sql
basis_dt = :basis_date
```

금액:

```sql
SUM(balance_krw_amt)
```

절대 여러 `basis_dt`의 잔고를 합산하지 않는다.

---

# 4. 원천 테이블

## bitmart.corp_customer_master

법인 고객 마스터.

주요 원천 컬럼:

| 원천 컬럼 | Dimension 컬럼 |
|---|---|
| `corp_cust_id` | `cust_id` |
| `cust_category_nm` | `account_status` |
| `cust_confirm_nm` | `kyc_status` |
| `corp_step_nm` | `market_stage` |
| `corp_market_type_nm` | `corp_market_type` |
| `corp_type_nm` | `corp_type` |

조인:

```sql
corp_customer_master.corp_cust_id = member_master.cust_id
```

---

## bitmart.member_master

회원 마스터.

주요 컬럼:

```text
mem_id
cust_id
mem_join_dtm
mem_leave_dtm
```

---

## bitmart.customer_master

고객 마스터.

현재 Dimension 생성 시 다음 KYC 예정일을 가져오는 데 사용한다.

```text
cust_id
cust_type
kyc_next_execute_dtm
```

### cust_type

고객 유형 구분 값:

```text
1 = 개인
2 = 법인
```

법인 고객만 조회해야 하는 경우:

```sql
cust_type = '2'
```


### cust_type_cd

고객 유형 코드.

```text
01 = 개인
02 = 법인
```

법인 고객만 조회해야 하는 경우:

```sql
cust_type_cd = '02'
```

---

## bitmart.customer_kyc_review_history

KYC 이력 테이블.

현재 balance MV에서는 `2025-01-01` 이후 KYC 완료 이력 존재 여부를 확인하는 데 사용한다.

주요 컬럼:

```text
cust_id
kyc_confirm_dtm
```

---

## bitmart.asset_inout_transaction_list

매수/매도 원천 거래 테이블.

주요 컬럼:

```text
mem_id
transfer_type_cd
inout_type_cd
coin_symbol_nm
inout_dt
inout_qty
inout_amt
```

매수:

```sql
transfer_type_cd = 'BUY'
AND inout_type_cd = 'COINI'
```

매도:

```sql
transfer_type_cd = 'SELL'
AND inout_type_cd = 'COINO'
```

---

## bitmart.coin_deposit_list

코인 입금 원천 테이블.

현재 MV에서 사용하는 주요 컬럼:

```text
mem_id
coin_type_cd
deposit_type_cd
mdfy_dtm
deposit_qty
deposit_krw_amt
```

구분:

```text
OUT → 외부입금
IN  → 내부입금
```

---

## bitmart.coin_withdrawal_list

코인 출금 원천 테이블.

현재 MV에서 사용하는 주요 컬럼:

```text
mem_id
coin_type_cd
withdrawal_type_cd
withdrawal_dtm
withdrawal_qty
withdrawal_finish_krw_amt
```

구분:

```text
OUT → 외부출금
IN  → 내부출금
```

---

## bitmart.coin_master

코인 코드와 심볼 매핑.

현재 MV에서 사용하는 컬럼:

```text
coin_type_cd
coin_symbol_nm
```

---

## ods.oracle_cs_cust_base

현재 Dimension SQL에서 법인명을 가져오는 원천.

```text
cust_id
cust_ko_nm
```

매핑:

```sql
cust_ko_nm AS corp_nm
```

---

## ods.oracle_baml_kyc_corp_exam_list

현재 Dimension SQL에서 최초/최근 KYC 완료일을 생성하는 원천.

주요 컬럼:

```text
cust_id
kyc_exe_fns_dtm
```

집계:

```sql
MIN(kyc_exe_fns_dtm) AS first_kyc_dtm
MAX(kyc_exe_fns_dtm) AS latest_kyc_dtm
```

---

# 5. Weekly Summary 분류 규칙

화면의 `이번주 실적`은 아래 6개 행 + 합계로 표시한다.

| 법인 유형 | 타겟 구분 |
|---|---|
| 1단계 | `-` |
| 2단계 | `상장법인-core` |
| 2단계 | `상장법인-mass` |
| 2단계 | `전문투자자등록법인` |
| 3단계 | `-` |
| 기타 | `-` |
| 합계 | `-` |

권장 CASE:

```sql
CASE
    WHEN market_stage = '1단계'
        THEN '1단계'

    WHEN market_stage = '2단계'
         AND corp_market_type = '상장법인'
         AND is_core = 'Y'
        THEN '2단계 상장법인-core'

    WHEN market_stage = '2단계'
         AND corp_market_type = '상장법인'
         AND COALESCE(is_core, 'N') <> 'Y'
        THEN '2단계 상장법인-mass'

    WHEN market_stage = '2단계'
         AND corp_market_type = '전문투자자등록법인'
        THEN '2단계 전문투자자등록법인'

    WHEN market_stage = '3단계'
        THEN '3단계'

    ELSE '기타'
END
```

> `corp_market_type`의 실제 값이 운영 DB에서 다른 문자열이면
> 실제 코드값에 맞춰 이 CASE를 수정한다.

---

# 6. Weekly Summary 출력 컬럼

## 이번주 실적

```text
법인 유형
타겟 구분
온보딩수(개)
예치금(원)
거래대금(원)
```

- 온보딩수: `COUNT(DISTINCT cust_id)`
- 예치금: `SUM(balance_krw_amt)`
- 거래대금: `SUM(krw_amt)`

## 전주대비

```text
일자
합계
1단계
2단계
3단계
기타(해외법인)
예치금(백만원)
거래대금(백만원)
```

`2단계`는 아래 3개 분류의 합계다.

```text
상장법인-core
상장법인-mass
전문투자자등록법인
```

백만원 환산:

```sql
ROUND(amount_krw / 1000000.0)
```

화면 예시:
- 5,294,559,497.94원 → 5,295백만원
- 9,290,548,069.125원 → 9,291백만원

---

# 7. SQL 생성 제약

1. 조회 SQL만 생성한다.
2. `SELECT` 또는 `WITH ... SELECT`만 허용한다.
3. `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE` 금지.
4. Weekly Summary / 일반 법인 조회는 가능하면 `analysis` Dimension/MV를 우선 사용한다.
5. 원천 테이블을 사용할 때는 이 문서에 명시된 실제 컬럼만 사용한다.
6. 존재하지 않는 테이블/컬럼을 추측하지 않는다.
7. 온보딩 법인 수는 `COUNT(DISTINCT cust_id)`로 계산한다.
8. 거래대금에는 `매수`, `매도`만 포함한다.
9. 거래대금은 2025-01-01부터 기준일까지 누적한다.
10. 예치금은 기준일 Snapshot만 집계한다.
11. 금액이 없는 경우 `COALESCE(..., 0)`를 사용한다.
12. Weekly Summary의 분류 행은 데이터가 0이어도 출력될 수 있도록 category master CTE 또는 고정 row set 사용을 권장한다.
