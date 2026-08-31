export type ReportStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Report {
  id: string;
  name: string;
  status: ReportStatus;
  previousDate: string | null;
  currentDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportListResponse {
  items: Report[];
  nextCursor: string | null;
}

export interface SummaryMetric {
  onboardingCount: number;
  balanceKrw: number;
  transactionKrw: number;
}

export interface SummaryTableRow {
  corpType: string;
  targetGroup: string;
  previous: SummaryMetric;
  current: SummaryMetric;
}

export interface ComparisonTableRow {
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

export interface ReportSummary {
  report: {
    id: string;
    name: string;
    status: ReportStatus;
    previousDate: string;
    currentDate: string;
    generatedAt: string;
  };
  sourceDates: {
    previousBalanceBasisDate: string;
    currentBalanceBasisDate: string;
  };
  summaryTable: {
    title: string;
    previousLabel: string;
    currentLabel: string;
    rows: SummaryTableRow[];
  };
  comparisonTable: {
    title: string;
    unit: {
      balanceKrw: "MILLION_KRW";
      transactionKrw: "MILLION_KRW";
    };
    rows: ComparisonTableRow[];
  };
  sentenceSummary: {
    title: string;
    lines: string[];
  };
}

export interface DetailColumn {
  key: string;
  label: string;
  dataType?: string;
}

export interface ReportDetailResponse {
  report: {
    id: string;
    name: string;
    currentDate: string;
  };
  basis: Record<string, string>;
  columns: DetailColumn[];
  items: Record<string, string | number | null>[];
  page: {
    currentPage: number;
    limit: number;
    nextCursor: string | null;
    totalItems: number;
    totalPages: number;
  };
}

export interface DashboardOverview {
  basisDate: string;
  balanceBasisDate: string;
  totals: {
    transactionKrw: number;
    balanceKrw: number;
    onboardingCount: number;
  };
  upcomingKycCorporations: Record<string, string | number | null>[];
}

export interface SqlGuideResponse {
  answer: string;
  sql: string | null;
  usedTables: string[];
  cautions: string[];
  isSafeSelect: boolean;
  raw: string;
  queryResult?: {
    executed: boolean;
    columns: string[];
    executedSql: string | null;
    rows: Record<string, string | number | boolean | null>[];
    rowCount: number;
    error: string | null;
  };
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const desktopConfig = (
      window as Window & {
        corpSummaryConfig?: {
          apiBaseUrl?: string;
        };
      }
    ).corpSummaryConfig;

    if (desktopConfig?.apiBaseUrl) {
      return desktopConfig.apiBaseUrl;
    }
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = "요청을 처리하지 못했습니다.";

    try {
      const errorBody = (await response.json()) as ApiErrorResponse;
      message = errorBody.error?.message ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listReports(): Promise<ReportListResponse> {
  return request<ReportListResponse>("/reports?limit=20");
}

export function createReport(name: string): Promise<Report> {
  return request<Report>("/reports", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function runReport(
  reportId: string,
  previousDate: string,
  currentDate: string,
): Promise<ReportSummary> {
  return request<ReportSummary>(`/reports/${reportId}/run`, {
    method: "POST",
    body: JSON.stringify({ previousDate, currentDate }),
  });
}

export function getReportSummary(reportId: string): Promise<ReportSummary> {
  return request<ReportSummary>(`/reports/${reportId}/summary`);
}

export function getReportDetail(
  reportId: string,
  kind: "transactions" | "balances" | "onboarding",
  page = 1,
  limit = 50,
): Promise<ReportDetailResponse> {
  return request<ReportDetailResponse>(`/reports/${reportId}/${kind}?page=${page}&limit=${limit}`);
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return request<DashboardOverview>("/dashboard");
}

export function createSqlGuide(question: string, dialect: "postgres" | "redshift" = "postgres"): Promise<SqlGuideResponse> {
  return request<SqlGuideResponse>("/ai/sql-guide", {
    method: "POST",
    body: JSON.stringify({ question, dialect }),
  });
}
