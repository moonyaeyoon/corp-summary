import { ReportStatus } from '../reports.entity.js';

export interface ReportSummaryReportDto {
  id: string;
  name: string;
  status: ReportStatus;
  previousDate: string;
  currentDate: string;
  generatedAt: string;
}

export interface SourceDatesDto {
  previousBalanceBasisDate: string;
  currentBalanceBasisDate: string;
}

export interface SummaryMetricDto {
  onboardingCount: number;
  balanceKrw: number;
  transactionKrw: number;
}

export interface SummaryTableRowDto {
  corpType: string;
  targetGroup: string;
  previous: SummaryMetricDto;
  current: SummaryMetricDto;
}

export interface SummaryTableDto {
  title: string;
  previousLabel: string;
  currentLabel: string;
  rows: SummaryTableRowDto[];
}

export interface ComparisonTableRowDto {
  label: string;
  total: number;
  stage1: number;
  stage2: number;
  stage3: number;
  etc: number;
  balanceMillionKrw: number;
  transactionMillionKrw: number;
  isDiff?: boolean;
}

export interface ComparisonTableDto {
  title: string;
  unit: {
    balanceKrw: 'MILLION_KRW';
    transactionKrw: 'MILLION_KRW';
  };
  rows: ComparisonTableRowDto[];
}

export interface SentenceSummaryDto {
  title: string;
  lines: string[];
}

export interface ReportSummaryResponseDto {
  report: ReportSummaryReportDto;
  sourceDates: SourceDatesDto;
  summaryTable: SummaryTableDto;
  comparisonTable: ComparisonTableDto;
  sentenceSummary: SentenceSummaryDto;
}
