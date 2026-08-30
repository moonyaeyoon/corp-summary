# guide.md — Weekly Summary 집계 기준 (Current)

이 문서는 **현재 Weekly Summary 화면의 집계 규칙만 정의한다.**

이전 guide.md의 날짜/집계/분류 규칙은 사용하지 않는다.

---

# 1. 입력 날짜

Weekly Summary 생성 시 두 날짜를 입력으로 사용한다.

```text
prev_date : 비교 기준 날짜
curr_date : 현재 집계 기준 날짜
```

화면에서 사용자가 선택한 From / To 날짜를 그대로 사용한다.

따라서 `prev_date = curr_date - 7일`로 자동 가정하지 않는다.

예:

```text
prev_date = 2026-07-07
curr_date = 2026-08-27
```

---

# 2. 최종 출력

Weekly Summary는 다음 3개 영역으로 구성한다.

1. 이번주 실적
2. 전주대비
3. 문장요약

---

# 3. 이번주 실적

`curr_date` 기준으로 다음 표를 생성한다.

| 법인 유형 | 타겟 구분 | 온보딩수(개) | 예치금(원) | 거래대금(원) |
|---|---|---:|---:|---:|
| 1단계 | - | | | |
| 2단계 | 상장법인-core | | | |
| 2단계 | 상장법인-mass | | | |
| 2단계 | 전문투자자등록법인 | | | |
| 3단계 | - | | | |
| 기타 | - | | | |
| 합계 | - | | | |

행이 존재하지 않는 경우에도 0을 출력한다.

---

# 4. 온보딩 집계

## 4.1 대상 조건

온보딩 대상은 아래 둘 중 하나를 만족해야 한다.

### 조건 A

```text
account_status = '활성화계정'
AND
kyc_status = '고객확인완료'
```

### 조건 B

```text
account_status = '휴면계정'
AND
kyc_status = '고객확인전단계'
```

즉:

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

그리고 반드시:

```sql
latest_kyc_dtm >= TIMESTAMP '2025-01-01 00:00:00'
```

를 만족해야 한다.

기준일 D의 실적을 계산하는 경우 해당 기준일 이후의 KYC를 포함하지 않는다.

```sql
latest_kyc_dtm < DATEADD(day, 1, :basis_date)
```

## 4.2 집계 단위

법인 고객 수는 반드시:

```sql
COUNT(DISTINCT cust_id)
```

로 계산한다.

`mem_id` 행 수를 세지 않는다.

## 4.3 기준 날짜별 온보딩

현재 실적:

```text
basis_date = curr_date
```

비교 실적:

```text
basis_date = prev_date
```

---

# 5. 예치금 집계

예치금은 `analysis.myy_corp_balance_mv`를 기준으로 집계한다.

## 핵심 조건

```sql
basis_dt = :basis_date
```

현재 실적:

```sql
basis_dt = :curr_date
```

비교 실적:

```sql
basis_dt = :prev_date
```

## 금액

```sql
SUM(balance_krw_amt)
```

## 절대 금지

잔고는 일별 Snapshot이므로:

```text
여러 날짜의 balance_krw_amt를 합산하지 않는다.
```

예를 들어 8월 전체 예치금을 구한다는 이유로
8월 1일~31일 잔고를 모두 더하면 안 된다.

Weekly Summary에서는 선택한 기준 날짜의 Snapshot만 사용한다.

---

# 6. 거래대금 집계

거래대금은 `analysis.myy_corp_transaction_mv`를 기준으로 집계한다.

## 거래 유형

반드시:

```sql
transaction_type IN ('매수', '매도')
```

만 포함한다.

다음은 거래대금에서 제외한다.

```text
코인입금
코인출금
```

## 누적 시작일

```sql
transaction_dtm >= TIMESTAMP '2025-01-01 00:00:00'
```

## 기준일까지 누적

현재 실적:

```sql
transaction_dtm >= TIMESTAMP '2025-01-01 00:00:00'
AND transaction_dtm < DATEADD(day, 1, :curr_date)
```

비교 실적:

```sql
transaction_dtm >= TIMESTAMP '2025-01-01 00:00:00'
AND transaction_dtm < DATEADD(day, 1, :prev_date)
```

## 금액

```sql
SUM(krw_amt)
```

따라서 거래대금 전주대비 증감은:

```text
curr_date까지 누적 거래대금
-
prev_date까지 누적 거래대금
```

이다.

---

# 7. 법인 분류

Weekly Summary는 다음 순서로 분류한다.

## 7.1 1단계

```sql
market_stage = '1단계'
```

출력:

```text
법인 유형 = 1단계
타겟 구분 = -
```

## 7.2 2단계 상장법인-core

```sql
market_stage = '2단계'
AND corp_market_type = '상장법인'
AND is_core = 'Y'
```

출력:

```text
법인 유형 = 2단계
타겟 구분 = 상장법인-core
```

## 7.3 2단계 상장법인-mass

```sql
market_stage = '2단계'
AND corp_market_type = '상장법인'
AND COALESCE(is_core, 'N') <> 'Y'
```

출력:

```text
법인 유형 = 2단계
타겟 구분 = 상장법인-mass
```

## 7.4 2단계 전문투자자등록법인

```sql
market_stage = '2단계'
AND corp_market_type = '전문투자자등록법인'
```

출력:

```text
법인 유형 = 2단계
타겟 구분 = 전문투자자등록법인
```

## 7.5 3단계

```sql
market_stage = '3단계'
```

출력:

```text
법인 유형 = 3단계
타겟 구분 = -
```

## 7.6 기타

위 분류에 속하지 않는 법인.

출력:

```text
법인 유형 = 기타
타겟 구분 = -
```

---

# 8. 이번주 실적 합계

합계 행은 6개 세부 행을 합산한다.

```text
온보딩수 = 6개 분류의 온보딩수 합
예치금 = 6개 분류의 예치금 합
거래대금 = 6개 분류의 거래대금 합
```

중복 법인이 생기지 않도록 각 법인은 하나의 분류에만 속해야 한다.

---

# 9. 전주대비

전주대비 표:

| 일자 | 합계 | 1단계 | 2단계 | 3단계 | 기타(해외법인) | 예치금(백만원) | 거래대금(백만원) |
|---|---:|---:|---:|---:|---:|---:|---:|
| prev_date | | | | | | | |
| curr_date | | | | | | | |
| 대비증감 | | | | | | | |

## 9.1 온보딩 단계 합계

### 합계

전체 온보딩 법인 수.

### 1단계

1단계 온보딩 수.

### 2단계

다음 3개 행을 합산한다.

```text
상장법인-core
상장법인-mass
전문투자자등록법인
```

### 3단계

3단계 온보딩 수.

### 기타(해외법인)

기타 분류 온보딩 수.

## 9.2 대비증감

각 컬럼:

```text
curr 값 - prev 값
```

## 9.3 금액 단위

전주대비 표의 예치금과 거래대금은 `백만원` 단위로 출력한다.

```sql
ROUND(amount_krw / 1000000.0)
```

예:

```text
5,294,559,497.94원
→ 5,295백만원
```

```text
9,290,548,069.125원
→ 9,291백만원
```

---

# 10. 문장요약

문장요약은 전주대비 표의 계산 결과를 그대로 사용한다.

형식:

```text
법인 고객 주간 실적 {curr_total}개사, 전주대비 {delta_total}
온보딩: 전체 {curr_total}개사, 2단계 {curr_stage2}개사
예치금: {curr_balance_million}백만원 ({signed_balance_delta})
거래대금: {curr_trade_million}백만원 ({signed_trade_delta})
```

예시:

```text
법인 고객 주간 실적 215개사, 전주대비 0
온보딩: 전체 215개사, 2단계 93개사
예치금: 5,295백만원 (+5295)
거래대금: 9,291백만원 (+268)
```

양수 증감은 `+`를 붙인다.

```text
+268
```

0은:

```text
0
```

음수는 그대로:

```text
-10
```

---

# 11. 화면 예시 검증값

제공된 Weekly Summary 화면에서 확인되는 현재 집계 결과:

## 이번주 실적

| 법인 유형 | 타겟 구분 | 온보딩수 | 예치금(원) | 거래대금(원) |
|---|---|---:|---:|---:|
| 1단계 | - | 75 | 81,943.664 | 4,287,098,758.851 |
| 2단계 | 상장법인-core | 28 | 0 | 0 |
| 2단계 | 상장법인-mass | 38 | 225,027,604.9 | 5,003,308,311.27 |
| 2단계 | 전문투자자등록법인 | 27 | 0 | 0 |
| 3단계 | - | 42 | 5,069,449,949.376 | 140,999.005 |
| 기타 | - | 5 | 0 | 0 |
| 합계 | - | 215 | 5,294,559,497.94 | 9,290,548,069.125 |

## 전주대비 예시

현재 화면의 curr_date 행:

```text
합계 = 215
1단계 = 75
2단계 = 93
3단계 = 42
기타 = 5
예치금 = 5,295백만원
거래대금 = 9,291백만원
```

이 값들은 SQL/LLM 결과 검증용 샘플로 사용할 수 있다.

---

# 12. 자연어 질의와 Weekly Summary 구분

## Weekly Summary 요청

예:

```text
7월 7일과 8월 27일 기준 실적 비교해줘
8월 27일 실적 집계해줘
Weekly Summary 만들어줘
```

해당 요청은 이 guide의 집계 규칙을 따른다.

## 자유 조회

예:

```text
A법인의 8월 거래내역 보여줘
BTC 매수 내역 보여줘
이번주 코인 입금 법인 보여줘
```

자유 조회는 `schema.md`의 컬럼/테이블 정의를 사용하되,
Weekly Summary의 누적/분류 규칙을 무조건 강제하지 않는다.

---

# 13. 절대 규칙

1. 이전 guide의 집계 규칙을 사용하지 않는다.
2. prev_date는 자동으로 curr_date - 7일로 만들지 않는다.
3. 온보딩은 지정된 account_status + kyc_status 조건을 사용한다.
4. 온보딩은 `latest_kyc_dtm >= 2025-01-01` 조건을 반드시 사용한다.
5. 법인 수는 `COUNT(DISTINCT cust_id)`로 계산한다.
6. 예치금은 `basis_dt = 기준 날짜` Snapshot만 집계한다.
7. 예치금을 기간 합산하지 않는다.
8. 거래대금은 `매수`, `매도`만 포함한다.
9. 거래대금은 2025-01-01부터 각 기준일까지 누적한다.
10. 코인입금/코인출금은 거래대금에서 제외한다.
11. 전주대비 금액은 백만원 단위로 반올림한다.
12. 분류별 값이 없으면 0으로 출력한다.
13. 합계는 세부 분류와 일치해야 한다.
