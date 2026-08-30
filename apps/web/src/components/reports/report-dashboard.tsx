"use client";

import { exportSummaryAsExcel } from "@/lib/report-export";
import {
  createReport,
  createSqlGuide,
  getDashboardOverview,
  getReportDetail,
  getReportSummary,
  listReports,
  runReport,
  type DashboardOverview,
  type DetailColumn,
  type Report,
  type ReportSummary,
  type SqlGuideResponse,
} from "@/lib/reports-api";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { DatePicker } from "./date-picker";
import { Icon } from "./icon";
import { DataList, MainTabs, OverviewPanel } from "./report-tables";

const detailColumns: Record<string, DetailColumn[]> = {
  "거래 내역": [
    { key: "transaction_type", label: "구분" },
    { key: "inout_type", label: "입출금구분" },
    { key: "account_status", label: "계정상태" },
    { key: "corp_nm", label: "법인이름" },
    { key: "cust_id", label: "고객ID" },
    { key: "mem_id", label: "회원ID" },
    { key: "market_stage", label: "시장참여단계" },
    { key: "corp_type", label: "법인유형" },
    { key: "coin_symbol_nm", label: "코인심볼명" },
    { key: "transaction_dtm", label: "거래일자" },
    { key: "coin_qty", label: "코인수량" },
    { key: "krw_amt", label: "원화환산거래금액" },
    { key: "is_core", label: "core여부" },
  ],
  잔고: [
    { key: "basis_dt", label: "집계 날짜" },
    { key: "corp_nm", label: "법인이름" },
    { key: "cust_id", label: "고객ID" },
    { key: "mem_id", label: "회원ID" },
    { key: "market_stage", label: "시장참여단계" },
    { key: "corp_type", label: "법인유형" },
    { key: "coin_symbol_nm", label: "코인심볼명" },
    { key: "balance_krw_amt", label: "원화환산잔고" },
  ],
  온보딩: [
    { key: "corp_nm", label: "법인이름" },
    { key: "cust_id", label: "고객ID" },
    { key: "mem_id", label: "회원ID" },
    { key: "account_status", label: "계정상태" },
    { key: "kyc_status", label: "고객확인상태" },
    { key: "market_stage", label: "시장참여단계" },
    { key: "corp_market_type", label: "법인유형" },
    { key: "latest_kyc_dtm", label: "마지막고객확인날짜" },
  ],
};

const detailEndpointByTab: Record<string, "transactions" | "balances" | "onboarding"> = {
  "거래 내역": "transactions",
  잔고: "balances",
  온보딩: "onboarding",
};

function getDefaultReportName(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${month}.${day} 실적`;
}

function Sidebar({
  activeView,
  isReportsExpanded,
  onCreateClick,
  onDashboardClick,
  onQuestionsClick,
  onReportsClick,
  onSelectReport,
  onToggleReports,
  reports,
  selectedReportId,
}: {
  activeView: "dashboard" | "reports" | "report" | "questions";
  isReportsExpanded: boolean;
  onCreateClick: () => void;
  onDashboardClick: () => void;
  onQuestionsClick: () => void;
  onReportsClick: () => void;
  onSelectReport: (report: Report) => void;
  onToggleReports: () => void;
  reports: Report[];
  selectedReportId: string | null;
}) {
  return (
    <aside className="sidebar">
      <nav aria-label="Primary" className="sidebar-nav">
        <button
          className={activeView === "dashboard" ? "sidebar-link active" : "sidebar-link"}
          onClick={onDashboardClick}
          type="button"
        >
          <Icon name="chart" size={24} />
          <span>Dashboard</span>
        </button>

        <div className="sidebar-group">
          <div className="sidebar-group-title">
            <button
              className={activeView === "reports" || activeView === "report" ? "sidebar-link active" : "sidebar-link"}
              onClick={onReportsClick}
              type="button"
            >
              <Icon name="checkout" size={24} />
              <span>실적 집계</span>
            </button>
            <button className="sidebar-icon-button" onClick={onCreateClick} title="리포트 만들기" type="button">
              +
            </button>
            <button
              aria-expanded={isReportsExpanded}
              className="sidebar-toggle-button"
              onClick={onToggleReports}
              title={isReportsExpanded ? "리포트 목록 접기" : "리포트 목록 펼치기"}
              type="button"
            >
              <Icon name="chevronDown" size={18} />
            </button>
          </div>
          {isReportsExpanded ? (
            <div className="report-nav-list">
              {reports.map((report) => (
                <button
                  className={report.id === selectedReportId ? "report-nav-item selected" : "report-nav-item"}
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  title={report.name}
                  type="button"
                >
                  <span className="report-radio" />
                  <span>{report.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className={activeView === "questions" ? "sidebar-link active" : "sidebar-link"}
          onClick={onQuestionsClick}
          type="button"
        >
          <Icon name="questions" size={24} />
          <span>Questions</span>
        </button>
      </nav>
    </aside>
  );
}

function Header({ title }: { title: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <div aria-hidden="true" className="header-search">
        <span>⌕</span>
      </div>
    </header>
  );
}

function Footer() {
  return <footer className="page-footer" />;
}

function CreateReportModal({
  defaultName,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  defaultName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(name.trim());
  }

  return (
    <div className="modal-layer" role="presentation">
      <form className="create-modal" onSubmit={(event) => void handleSubmit(event)}>
        <div className="modal-header">
          <h2>실적</h2>
          <button className="modal-close" onClick={onClose} title="닫기" type="button">
            x
          </button>
        </div>
        <input
          autoFocus
          className="report-name-input"
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          placeholder="리포트 이름"
          value={name}
        />
        <button className="create-button" disabled={!name.trim() || isSubmitting} type="submit">
          만들기
        </button>
      </form>
    </div>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="date-field">
      <span>{label}</span>
      <div className="date-input-wrap">
        <Icon name="calendar" />
        <button
          className={value ? "date-value-button has-value" : "date-value-button"}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {value || "Choose Date"}
        </button>
        {value ? (
          <button
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            title="날짜 지우기"
            type="button"
          >
            <Icon name="clear" />
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className="date-picker-popover">
          <DatePicker
            onChange={(nextValue) => {
              onChange(nextValue);
              setIsOpen(false);
            }}
            value={value}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReportSetupPanel({
  currentDate,
  errorMessage,
  isRunning,
  onCurrentDateChange,
  onPreviousDateChange,
  onRun,
  previousDate,
  selectedReport,
}: {
  currentDate: string;
  errorMessage: string | null;
  isRunning: boolean;
  onCurrentDateChange: (value: string) => void;
  onPreviousDateChange: (value: string) => void;
  onRun: () => Promise<void>;
  previousDate: string;
  selectedReport: Report | null;
}) {
  return (
    <div className="date-picker-screen">
      <div className="date-grid">
        <DateField label="From" onChange={onPreviousDateChange} value={previousDate} />
        <DateField label="To" onChange={onCurrentDateChange} value={currentDate} />
      </div>
      <button
        className="primary-button run-button"
        disabled={!selectedReport || !previousDate || !currentDate || isRunning}
        onClick={() => void onRun()}
        type="button"
      >
        {isRunning ? "집계 중" : "집계 시작"}
      </button>
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </div>
  );
}

function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | number | null | undefined): string {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 10);
}

function DashboardPanel({
  dashboard,
  isLoading,
}: {
  dashboard: DashboardOverview | null;
  isLoading: boolean;
}) {
  const todayLabel = dashboard?.basisDate ?? new Date().toISOString().slice(0, 10);
  const upcomingRows = dashboard?.upcomingKycCorporations ?? [];

  return (
    <section className="dashboard-panel">
      <div className="dashboard-date">
        <span>Today</span>
        <strong>{todayLabel}</strong>
      </div>
      <div className="metric-strip">
        <div className="metric-item">
          <span>거래대금</span>
          <strong>{formatKrw(dashboard?.totals.transactionKrw ?? 0)}</strong>
        </div>
        <div className="metric-item">
          <span>예치금</span>
          <strong>{formatKrw(dashboard?.totals.balanceKrw ?? 0)}</strong>
          <small>잔고 기준일 {dashboard?.balanceBasisDate ?? "-"}</small>
        </div>
        <div className="metric-item">
          <span>온보딩</span>
          <strong>{(dashboard?.totals.onboardingCount ?? 0).toLocaleString("ko-KR")}개사</strong>
        </div>
      </div>
      <section className="dashboard-list-section">
        <div className="section-heading">
          <h3>KYC 돌아오는 법인</h3>
          <span className="section-note">오늘부터 1주일 이내</span>
        </div>
        {isLoading ? (
          <div className="empty-dashboard">데이터를 불러오는 중입니다.</div>
        ) : upcomingRows.length > 0 ? (
          <div className="kyc-list">
            {upcomingRows.map((row, index) => (
              <div className="kyc-row" key={`${row.cust_id ?? "corp"}-${index}`}>
                <div>
                  <strong>{row.corp_nm ?? "-"}</strong>
                  <span>
                    {row.market_stage ?? "-"} / {row.corp_market_type ?? row.corp_type ?? "-"}
                  </span>
                </div>
                <time>{formatDate(row.next_kyc_dtm)}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-dashboard">일주일 안에 KYC가 돌아오는 법인이 없습니다.</div>
        )}
      </section>
    </section>
  );
}

function ReportsListPanel({
  onCreateClick,
  onSelectReport,
  reports,
}: {
  onCreateClick: () => void;
  onSelectReport: (report: Report) => void;
  reports: Report[];
}) {
  return (
    <section className="reports-list-panel">
      <div className="report-section-title">
        <h2>리포트 목록</h2>
        <button className="primary-button small-primary-button" onClick={onCreateClick} type="button">
          리포트 만들기
        </button>
      </div>
      <div className="reports-grid">
        {reports.length > 0 ? (
          reports.map((report) => (
            <button className="report-list-item" key={report.id} onClick={() => onSelectReport(report)} type="button">
              <strong>{report.name}</strong>
              <span>{report.status}</span>
              <small>
                {report.previousDate ?? "-"} ~ {report.currentDate ?? "-"}
              </small>
            </button>
          ))
        ) : (
          <div className="empty-dashboard">생성된 리포트가 없습니다.</div>
        )}
      </div>
    </section>
  );
}

function buildSqlGuideText(response: SqlGuideResponse): string {
  return [
    response.answer,
    response.queryResult?.executedSql || response.sql
      ? ["", "SQL:", response.queryResult?.executedSql ?? response.sql].join("\n")
      : "",
    response.queryResult?.executed
      ? ["", "조회 결과:", JSON.stringify(response.queryResult.rows, null, 2)].join("\n")
      : "",
    response.usedTables.length > 0 ? ["", "사용 테이블:", response.usedTables.join(", ")].join("\n") : "",
    response.cautions.length > 0 ? ["", "주의사항:", ...response.cautions.map((item) => `- ${item}`)].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyText(text: string, onCopied: () => void) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }

  onCopied();
}

function QuestionsPanel({
  answer,
  errorMessage,
  isSubmitting,
  onCopied,
  onQuestionChange,
  onSubmit,
  question,
}: {
  answer: SqlGuideResponse | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  onCopied: () => void;
  onQuestionChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  question: string;
}) {
  const fullAnswerText = answer ? buildSqlGuideText(answer) : "";
  const displayedSql = answer?.queryResult?.executedSql ?? answer?.sql;

  return (
    <section className="questions-panel">
      <h2>데이터 Q&A</h2>
      <form
        className="question-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label htmlFor="question-input">질문</label>
        <textarea
          id="question-input"
          maxLength={2000}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="법인 데이터에 대해 질문해 주세요. 예) 8월 27일 기준 예치금이 가장 많은 법인 10개 보여줘"
          value={question}
        />
        <button className="primary-button question-submit-button" disabled={!question.trim() || isSubmitting} type="submit">
          {isSubmitting ? "질문 중" : "질문하기"}
        </button>
      </form>

      <div className="answer-heading">
        <h3>답변</h3>
        {answer ? (
          <button
            className="icon-button"
            onClick={() => void copyText(fullAnswerText, onCopied)}
            title="답변 전체 복사"
            type="button"
          >
            <Icon name="copy" />
          </button>
        ) : null}
      </div>
      <div className="answer-area">
        {isSubmitting ? (
          <p className="answer-placeholder">답변을 생성하는 중입니다.</p>
        ) : answer ? (
          <div className="answer-content">
            <p>{answer.answer}</p>
            {displayedSql ? (
              <div className="code-block-wrap">
                <div className="code-block-toolbar">
                  <span>SQL</span>
                  <button
                    className="icon-button"
                    onClick={() => void copyText(displayedSql, onCopied)}
                    title="SQL 복사"
                    type="button"
                  >
                    <Icon name="copy" />
                  </button>
                </div>
                <SyntaxHighlighter
                  customStyle={{
                    background: "transparent",
                    margin: 0,
                    padding: "16px",
                  }}
                  language="sql"
                  style={oneLight}
                >
                  {displayedSql}
                </SyntaxHighlighter>
              </div>
            ) : null}
            {answer.queryResult?.executed ? <QueryResultPreview queryResult={answer.queryResult} /> : null}
            {answer.usedTables.length > 0 ? (
              <div className="answer-meta">
                <strong>사용 테이블</strong>
                <span>{answer.usedTables.join(", ")}</span>
              </div>
            ) : null}
            {answer.cautions.length > 0 || !answer.isSafeSelect ? (
              <div className="answer-meta">
                <strong>주의사항</strong>
                {answer.isSafeSelect ? null : <span>생성된 SQL이 조회 전용인지 한 번 더 확인해 주세요.</span>}
                {answer.cautions.map((caution) => (
                  <span key={caution}>{caution}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="answer-placeholder">질문하면 이곳에 답변이 표시됩니다.</p>
        )}
      </div>
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
    </section>
  );
}

function QueryResultPreview({
  queryResult,
}: {
  queryResult: NonNullable<SqlGuideResponse["queryResult"]>;
}) {
  return (
    <div className="query-result-preview">
      <div className="query-result-heading">
        <strong>조회 결과</strong>
        <span>{queryResult.rowCount.toLocaleString("ko-KR")}건</span>
      </div>
      {queryResult.rows.length > 0 && queryResult.columns.length > 0 ? (
        <div className="query-result-scroll">
          <table>
            <thead>
              <tr>
                {queryResult.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {queryResult.columns.map((column) => (
                    <td key={column}>{String(row[column] ?? "-")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>조건에 맞는 데이터가 없습니다.</p>
      )}
    </div>
  );
}

function ReportContent({
  activeTab,
  detailColumns: activeDetailColumns,
  detailPage,
  detailRows,
  isDetailLoading,
  onCopied,
  onExcelDownload,
  onPageChange,
  onTabChange,
  summary,
}: {
  activeTab: string;
  detailColumns: DetailColumn[];
  detailPage: {
    currentPage: number;
    totalItems: number;
    totalPages: number;
  };
  detailRows: Record<string, string | number | null>[];
  isDetailLoading: boolean;
  onCopied: () => void;
  onExcelDownload: () => void;
  onPageChange: (page: number) => void;
  onTabChange: (tab: string) => void;
  summary: ReportSummary;
}) {
  return (
    <section className="report-content">
      <MainTabs activeTab={activeTab} onChange={onTabChange} />
      {activeTab === "Overview" ? (
        <div className="overview-panel">
          <div className="report-section-title">
            <h2>Weekly Summary</h2>
            <button className="excel-button" onClick={onExcelDownload} type="button">
              <Icon name="download" />
              <span>Excel 다운로드</span>
            </button>
          </div>
          <OverviewPanel summary={summary} onCopied={onCopied} />
        </div>
      ) : (
        <DataList
          columns={activeDetailColumns}
          currentPage={detailPage.currentPage}
          isLoading={isDetailLoading}
          onPageChange={onPageChange}
          rows={detailRows}
          totalItems={detailPage.totalItems}
          totalPages={detailPage.totalPages}
        />
      )}
    </section>
  );
}

export function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [activeView, setActiveView] = useState<"dashboard" | "reports" | "report" | "questions">("dashboard");
  const [isReportsExpanded, setIsReportsExpanded] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [detailData, setDetailData] = useState<
    Record<
      string,
      {
        columns: DetailColumn[];
        currentPage: number;
        rows: Record<string, string | number | null>[];
        totalItems: number;
        totalPages: number;
      }
    >
  >({});
  const [detailLoadingTab, setDetailLoadingTab] = useState<string | null>(null);
  const [previousDate, setPreviousDate] = useState("2026-07-07");
  const [currentDate, setCurrentDate] = useState("2026-08-27");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState<SqlGuideResponse | null>(null);
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pageTitle =
    activeView === "dashboard" ? "Dashboard" : activeView === "questions" ? "Q&A" : summary ? "Summary" : "Reports";
  const defaultReportName = useMemo(() => getDefaultReportName(), []);

  useEffect(() => {
    listReports()
      .then((response) => {
        setReports(response.items);
      })
      .catch((error: Error) => setErrorMessage(error.message));
  }, []);

  useEffect(() => {
    getDashboardOverview()
      .then(setDashboard)
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsDashboardLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 1800);

    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleCreateReport(name: string) {
    if (!name) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const report = await createReport(name);
      setReports((items) => [report, ...items]);
      setSelectedReport(report);
      setSummary(null);
      setActiveTab("Overview");
      setActiveView("report");
      setDetailData({});
      setIsCreateOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "리포트를 생성하지 못했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRunReport() {
    if (!selectedReport) {
      setErrorMessage("리포트를 먼저 생성해 주세요.");
      return;
    }

    if (previousDate > currentDate) {
      setErrorMessage("From 날짜는 To 날짜보다 늦을 수 없습니다.");
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);

    try {
      const result = await runReport(selectedReport.id, previousDate, currentDate);
      setSummary(result);
      setDetailData({});
      setSelectedReport((report) =>
        report
          ? {
              ...report,
              status: result.report.status,
              previousDate: result.report.previousDate,
              currentDate: result.report.currentDate,
            }
          : report,
      );
      setReports((items) =>
        items.map((report) =>
          report.id === result.report.id
            ? {
                ...report,
                status: result.report.status,
                previousDate: result.report.previousDate,
                currentDate: result.report.currentDate,
              }
            : report,
        ),
      );
      setActiveTab("Overview");
      setActiveView("report");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "집계를 실행하지 못했습니다.");
    } finally {
      setIsRunning(false);
    }
  }

  async function loadReportDetail(reportId: string, tab: string, page = 1) {
    const endpoint = detailEndpointByTab[tab];

    if (!endpoint) {
      return;
    }

    setDetailLoadingTab(tab);
    setErrorMessage(null);

    try {
      const response = await getReportDetail(reportId, endpoint, page);
      setDetailData((current) => ({
        ...current,
        [tab]: {
          columns: detailColumns[tab] ?? response.columns,
          currentPage: response.page.currentPage,
          rows: response.items,
          totalItems: response.page.totalItems,
          totalPages: response.page.totalPages,
        },
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "상세 데이터를 불러오지 못했습니다.");
    } finally {
      setDetailLoadingTab(null);
    }
  }

  async function handleTabChange(tab: string) {
    setActiveTab(tab);

    if (tab !== "Overview" && selectedReport) {
      await loadReportDetail(selectedReport.id, tab);
    }
  }

  async function handleDetailPageChange(page: number) {
    if (!selectedReport || activeTab === "Overview") {
      return;
    }

    await loadReportDetail(selectedReport.id, activeTab, page);
  }

  async function handleQuestionSubmit() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    setIsQuestionSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await createSqlGuide(trimmedQuestion);
      setQuestionAnswer(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "답변을 생성하지 못했습니다.");
    } finally {
      setIsQuestionSubmitting(false);
    }
  }

  async function handleSelectReport(report: Report) {
    setSelectedReport(report);
    setSummary(null);
    setActiveTab("Overview");
    setActiveView("report");
    setDetailData({});
    setErrorMessage(null);

    if (report.previousDate) {
      setPreviousDate(report.previousDate);
    }

    if (report.currentDate) {
      setCurrentDate(report.currentDate);
    }

    if (report.status === "COMPLETED") {
      try {
        const storedSummary = await getReportSummary(report.id);
        setSummary(storedSummary);
      } catch {
        setSummary(null);
      }
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        isReportsExpanded={isReportsExpanded}
        onCreateClick={() => setIsCreateOpen(true)}
        onDashboardClick={() => setActiveView("dashboard")}
        onQuestionsClick={() => {
          setActiveView("questions");
          setErrorMessage(null);
        }}
        onReportsClick={() => {
          setActiveView("reports");
          setIsReportsExpanded(true);
        }}
        onSelectReport={(report) => void handleSelectReport(report)}
        onToggleReports={() => setIsReportsExpanded((current) => !current)}
        reports={reports}
        selectedReportId={selectedReport?.id ?? null}
      />
      <div className="main-area">
        <Header title={pageTitle} />
        <main className="main-content">
          {activeView === "dashboard" ? (
            <DashboardPanel dashboard={dashboard} isLoading={isDashboardLoading} />
          ) : activeView === "questions" ? (
            <QuestionsPanel
              answer={questionAnswer}
              errorMessage={errorMessage}
              isSubmitting={isQuestionSubmitting}
              onCopied={() => setToast("복사되었습니다.")}
              onQuestionChange={setQuestion}
              onSubmit={handleQuestionSubmit}
              question={question}
            />
          ) : activeView === "reports" ? (
            <ReportsListPanel
              onCreateClick={() => setIsCreateOpen(true)}
              onSelectReport={(report) => void handleSelectReport(report)}
              reports={reports}
            />
          ) : summary ? (
            <ReportContent
              activeTab={activeTab}
              detailColumns={detailData[activeTab]?.columns ?? detailColumns[activeTab] ?? []}
              detailPage={{
                currentPage: detailData[activeTab]?.currentPage ?? 1,
                totalItems: detailData[activeTab]?.totalItems ?? 0,
                totalPages: detailData[activeTab]?.totalPages ?? 1,
              }}
              detailRows={detailData[activeTab]?.rows ?? []}
              isDetailLoading={detailLoadingTab === activeTab}
              onCopied={() => setToast("복사되었습니다.")}
              onExcelDownload={() => exportSummaryAsExcel(summary)}
              onPageChange={(page) => void handleDetailPageChange(page)}
              onTabChange={(tab) => void handleTabChange(tab)}
              summary={summary}
            />
          ) : (
            <ReportSetupPanel
              currentDate={currentDate}
              errorMessage={errorMessage}
              isRunning={isRunning}
              onCurrentDateChange={setCurrentDate}
              onPreviousDateChange={setPreviousDate}
              onRun={handleRunReport}
              previousDate={previousDate}
              selectedReport={selectedReport}
            />
          )}
        </main>
        <Footer />
      </div>
      {isCreateOpen ? (
        <CreateReportModal
          defaultName={defaultReportName}
          isSubmitting={isCreating}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateReport}
        />
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
