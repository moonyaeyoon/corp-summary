"use client";

import { exportSummaryAsExcel } from "@/lib/report-export";
import {
  createReport,
  listReports,
  runReport,
  type Report,
  type ReportSummary,
} from "@/lib/reports-api";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon } from "./icon";
import { DataList, MainTabs, OverviewPanel, type DataColumn } from "./report-tables";

const detailColumns: Record<string, DataColumn[]> = {
  "거래 내역": [
    { key: "transaction_type", label: "구분" },
    { key: "inout_type", label: "입출금구분" },
    { key: "account_status", label: "계정상태" },
    { key: "corp_nm", label: "법인이름" },
    { key: "cust_id", label: "고객ID" },
    { key: "mem_id", label: "회원ID" },
    { key: "market_stage", label: "시장참여단계" },
    { key: "corp_type", label: "법인유형" },
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

function formatSidebarDate(date: string | null): string {
  if (!date) {
    return "--.--";
  }

  const [, month, day] = date.split("-");

  return `${month}.${day}`;
}

function getDefaultReportName(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${month}.${day} 실적`;
}

function Sidebar({
  onCreateClick,
  onSelectReport,
  reports,
  selectedReportId,
}: {
  onCreateClick: () => void;
  onSelectReport: (report: Report) => void;
  reports: Report[];
  selectedReportId: string | null;
}) {
  return (
    <aside className="sidebar">
      <nav aria-label="Primary" className="sidebar-nav">
        <button className="sidebar-link active" type="button">
          <Icon name="chart" size={24} />
          <span>Dashboard</span>
        </button>

        <div className="sidebar-group">
          <div className="sidebar-group-title">
            <button className="sidebar-link" type="button">
              <Icon name="checkout" size={24} />
              <span>실적 집계</span>
            </button>
            <button className="sidebar-icon-button" onClick={onCreateClick} title="리포트 만들기" type="button">
              +
            </button>
            <Icon name="chevronDown" size={18} />
          </div>
          <div className="report-nav-list">
            {reports.map((report) => (
              <button
                className={report.id === selectedReportId ? "report-nav-item selected" : "report-nav-item"}
                key={report.id}
                onClick={() => onSelectReport(report)}
                title={report.name}
                type="button"
              >
                {formatSidebarDate(report.currentDate ?? report.createdAt?.slice(0, 10) ?? null)}
              </button>
            ))}
          </div>
        </div>

        <button className="sidebar-link muted" type="button">
          <Icon name="checkout" size={24} />
          <span>법인 리스트</span>
        </button>
        <button className="sidebar-link muted" type="button">
          <Icon name="checkout" size={24} />
          <span>Checkout</span>
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
  return (
    <label className="date-field">
      <span>{label}</span>
      <div className="date-input-wrap">
        <Icon name="calendar" />
        <input onChange={(event) => onChange(event.target.value)} type="date" value={value} />
        {value ? (
          <button onClick={() => onChange("")} title="날짜 지우기" type="button">
            <Icon name="clear" />
          </button>
        ) : null}
      </div>
    </label>
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

function ReportContent({
  activeTab,
  onCopied,
  onExcelDownload,
  onTabChange,
  summary,
}: {
  activeTab: string;
  onCopied: () => void;
  onExcelDownload: () => void;
  onTabChange: (tab: string) => void;
  summary: ReportSummary;
}) {
  const columns = detailColumns[activeTab] ?? [];

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
        <DataList columns={columns} rows={[]} />
      )}
    </section>
  );
}

export function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [previousDate, setPreviousDate] = useState("2026-07-07");
  const [currentDate, setCurrentDate] = useState("2026-08-27");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pageTitle = summary ? "Summary" : "Reports";
  const defaultReportName = useMemo(() => getDefaultReportName(), []);

  useEffect(() => {
    listReports()
      .then((response) => {
        setReports(response.items);
        setSelectedReport((current) => current ?? response.items[0] ?? null);
      })
      .catch((error: Error) => setErrorMessage(error.message));
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "집계를 실행하지 못했습니다.");
    } finally {
      setIsRunning(false);
    }
  }

  function handleSelectReport(report: Report) {
    setSelectedReport(report);
    setSummary(null);
    setActiveTab("Overview");

    if (report.previousDate) {
      setPreviousDate(report.previousDate);
    }

    if (report.currentDate) {
      setCurrentDate(report.currentDate);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        onCreateClick={() => setIsCreateOpen(true)}
        onSelectReport={handleSelectReport}
        reports={reports}
        selectedReportId={selectedReport?.id ?? null}
      />
      <div className="main-area">
        <Header title={pageTitle} />
        <main className="main-content">
          {summary ? (
            <ReportContent
              activeTab={activeTab}
              onCopied={() => setToast("복사되었습니다.")}
              onExcelDownload={() => exportSummaryAsExcel(summary)}
              onTabChange={setActiveTab}
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
