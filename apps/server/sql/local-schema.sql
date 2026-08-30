-- Local PostgreSQL schema for Swagger/API testing.
-- Run from repository root:
--   psql -d postgres -f apps/server/sql/local-schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  previous_date date NULL,
  current_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reports_name_unique_idx
  ON reports (name);

CREATE INDEX IF NOT EXISTS reports_updated_at_id_idx
  ON reports (updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS report_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  summary_table_json jsonb NOT NULL,
  comparison_table_json jsonb NOT NULL,
  sentence_summary_json jsonb NOT NULL,
  source_dates_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_results_report_id_created_at_idx
  ON report_results (report_id, created_at DESC);

CREATE TABLE IF NOT EXISTS myy_corp_balance_mv (
  basis_dt varchar(50) NOT NULL,
  cust_id varchar(50) NOT NULL,
  mem_id varchar(50) NOT NULL,
  account_status varchar(100) NOT NULL,
  kyc_status varchar(100) NOT NULL,
  corp_nm varchar(300) NOT NULL,
  market_stage varchar(100) NOT NULL,
  corp_type varchar(200) NOT NULL,
  is_core varchar(1) NOT NULL,
  coin_symbol_nm varchar(50) NOT NULL,
  coin_qty numeric(38, 18) NOT NULL DEFAULT 0,
  balance_krw_amt numeric(38, 18) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS myy_corp_balance_mv_summary_idx
  ON myy_corp_balance_mv (basis_dt, market_stage, corp_type, is_core);

CREATE TABLE IF NOT EXISTS myy_corp_transaction_mv (
  transaction_type varchar(20) NOT NULL,
  inout_type varchar(20) NULL,
  account_status varchar(100) NOT NULL,
  corp_nm varchar(300) NOT NULL,
  cust_id varchar(50) NOT NULL,
  mem_id varchar(50) NOT NULL,
  market_stage varchar(100) NOT NULL,
  corp_type varchar(200) NOT NULL,
  coin_symbol_nm varchar(2000) NOT NULL,
  transaction_dtm timestamp NOT NULL,
  coin_qty numeric(38, 18) NOT NULL DEFAULT 0,
  krw_amt numeric(38, 18) NOT NULL DEFAULT 0,
  basis_dt date NOT NULL,
  is_core varchar(1) NOT NULL
);

CREATE INDEX IF NOT EXISTS myy_corp_transaction_mv_summary_idx
  ON myy_corp_transaction_mv (
    transaction_type,
    transaction_dtm,
    market_stage,
    corp_type,
    is_core
  );

CREATE TABLE IF NOT EXISTS myy_corp_member_dim (
  cust_id varchar(50) NOT NULL,
  mem_id varchar(50) NOT NULL,
  corp_nm varchar(300) NOT NULL,
  account_status varchar(100) NOT NULL,
  kyc_status varchar(100) NOT NULL,
  market_stage varchar(100) NOT NULL,
  corp_market_type varchar(200) NOT NULL,
  corp_type varchar(200) NULL,
  is_core varchar(1) NOT NULL,
  member_join_dtm timestamp NULL,
  mem_leave_dtm timestamp NULL,
  first_kyc_dtm timestamp NULL,
  latest_kyc_dtm timestamp NULL,
  next_kyc_dtm timestamp NULL,
  is_onboarding_target varchar(1) NULL,
  loaded_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS myy_corp_member_dim_summary_idx
  ON myy_corp_member_dim (
    account_status,
    kyc_status,
    latest_kyc_dtm,
    market_stage,
    corp_market_type,
    is_core
  );
