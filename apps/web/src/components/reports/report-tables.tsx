"use client";

import { buildSummaryClipboardText } from "@/lib/report-export";
import type { ComparisonTableRow, ReportSummary, SummaryTableRow } from "@/lib/reports-api";
import { Icon } from "./icon";

export interface DataColumn {
  key: string;
  label: string;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("ko-KR") : "-";
}

async function copyText(text: string, onCopied?: () => void) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }

  onCopied?.();
}

function CopyButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  return (
    <button className="icon-button" onClick={() => void copyText(text, onCopied)} title="복사" type="button">
      <Icon name="copy" />
    </button>
  );
}

function buildWeeklyText(rows: SummaryTableRow[]): string {
  return rows
    .map((row) =>
      [
        row.corpType,
        row.targetGroup || "-",
        row.previous.onboardingCount,
        row.previous.balanceKrw,
        row.previous.transactionKrw,
        row.current.onboardingCount,
        row.current.balanceKrw,
        row.current.transactionKrw,
      ].join("\t"),
    )
    .join("\n");
}

function buildComparisonText(rows: ComparisonTableRow[]): string {
  return rows
    .map((row) =>
      [
        row.label,
        row.total,
        row.stage1,
        row.stage2,
        row.stage3,
        row.etc,
        row.balanceMillionKrw,
        row.transactionMillionKrw,
      ].join("\t"),
    )
    .join("\n");
}

export function MainTabs({
  activeTab,
  onChange,
}: {
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  const tabs = ["Overview", "거래 내역", "잔고", "온보딩"];

  return (
    <div className="main-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          aria-selected={activeTab === tab}
          className="main-tab"
          key={tab}
          onClick={() => onChange(tab)}
          role="tab"
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function WeeklyPerformanceTable({
  summary,
  onCopied,
}: {
  summary: ReportSummary;
  onCopied?: () => void;
}) {
  const rows = summary.summaryTable.rows;
  const total = rows.reduce(
    (acc, row) => ({
      previous: {
        onboardingCount: acc.previous.onboardingCount + row.previous.onboardingCount,
        balanceKrw: acc.previous.balanceKrw + row.previous.balanceKrw,
        transactionKrw: acc.previous.transactionKrw + row.previous.transactionKrw,
      },
      current: {
        onboardingCount: acc.current.onboardingCount + row.current.onboardingCount,
        balanceKrw: acc.current.balanceKrw + row.current.balanceKrw,
        transactionKrw: acc.current.transactionKrw + row.current.transactionKrw,
      },
    }),
    {
      previous: { onboardingCount: 0, balanceKrw: 0, transactionKrw: 0 },
      current: { onboardingCount: 0, balanceKrw: 0, transactionKrw: 0 },
    },
  );

  return (
    <section className="summary-section">
      <div className="section-heading">
        <h3>{summary.summaryTable.title}</h3>
        <CopyButton text={buildWeeklyText(rows)} onCopied={onCopied} />
      </div>
      <div className="table-scroll">
        <table className="wh-table weekly-table">
          <thead>
            <tr>
              <th rowSpan={2}>법인 유형</th>
              <th rowSpan={2}>
                타겟
                <br />
                구분
              </th>
              <th colSpan={3}>{summary.summaryTable.previousLabel}</th>
              <th colSpan={3}>{summary.summaryTable.currentLabel}</th>
            </tr>
            <tr>
              <th>온보딩수(개)</th>
              <th>예치금(원)</th>
              <th>거래대금(원)</th>
              <th>온보딩수(개)</th>
              <th>예치금(원)</th>
              <th>거래대금(원)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.corpType}-${row.targetGroup}-${index}`}>
                <td>{row.corpType}</td>
                <td>{row.targetGroup || "-"}</td>
                <td className="number-cell">{formatNumber(row.previous.onboardingCount)}</td>
                <td className="number-cell">{formatNumber(row.previous.balanceKrw)}</td>
                <td className="number-cell">{formatNumber(row.previous.transactionKrw)}</td>
                <td className="number-cell">{formatNumber(row.current.onboardingCount)}</td>
                <td className="number-cell">{formatNumber(row.current.balanceKrw)}</td>
                <td className="number-cell">{formatNumber(row.current.transactionKrw)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>합계</td>
              <td>-</td>
              <td className="number-cell">{formatNumber(total.previous.onboardingCount)}</td>
              <td className="number-cell">{formatNumber(total.previous.balanceKrw)}</td>
              <td className="number-cell">{formatNumber(total.previous.transactionKrw)}</td>
              <td className="number-cell">{formatNumber(total.current.onboardingCount)}</td>
              <td className="number-cell">{formatNumber(total.current.balanceKrw)}</td>
              <td className="number-cell">{formatNumber(total.current.transactionKrw)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ComparisonTable({
  summary,
  onCopied,
}: {
  summary: ReportSummary;
  onCopied?: () => void;
}) {
  return (
    <section className="summary-section">
      <div className="section-heading">
        <h3>{summary.comparisonTable.title}</h3>
        <CopyButton text={buildComparisonText(summary.comparisonTable.rows)} onCopied={onCopied} />
      </div>
      <div className="table-scroll">
        <table className="wh-table comparison-table">
          <thead>
            <tr>
              <th>일자</th>
              <th>합계</th>
              <th>1단계</th>
              <th>2단계</th>
              <th>3단계</th>
              <th>기타(해외법인)</th>
              <th>예치금(백만원)</th>
              <th>거래대금(백만원)</th>
            </tr>
          </thead>
          <tbody>
            {summary.comparisonTable.rows.map((row) => (
              <tr className={row.isDiff ? "total-row" : undefined} key={row.label}>
                <td>{row.label}</td>
                <td className="number-cell">{formatNumber(row.total)}</td>
                <td className="number-cell">{formatNumber(row.stage1)}</td>
                <td className="number-cell">{formatNumber(row.stage2)}</td>
                <td className="number-cell">{formatNumber(row.stage3)}</td>
                <td className="number-cell">{formatNumber(row.etc)}</td>
                <td className="number-cell">{formatNumber(row.balanceMillionKrw)}</td>
                <td className="number-cell">{formatNumber(row.transactionMillionKrw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SentenceSummary({
  summary,
  onCopied,
}: {
  summary: ReportSummary;
  onCopied?: () => void;
}) {
  return (
    <section className="summary-section sentence-section">
      <div className="section-heading">
        <h3>{summary.sentenceSummary.title}</h3>
        <CopyButton text={summary.sentenceSummary.lines.join("\n")} onCopied={onCopied} />
      </div>
      <div className="sentence-lines">
        {summary.sentenceSummary.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="section-divider" />
    </section>
  );
}

export function OverviewPanel({
  summary,
  onCopied,
}: {
  summary: ReportSummary;
  onCopied?: () => void;
}) {
  return (
    <>
      <WeeklyPerformanceTable summary={summary} onCopied={onCopied} />
      <ComparisonTable summary={summary} onCopied={onCopied} />
      <SentenceSummary summary={summary} onCopied={onCopied} />
      <button
        className="copy-all-button"
        onClick={() => void copyText(buildSummaryClipboardText(summary), onCopied)}
        type="button"
      >
        전체 복사
      </button>
    </>
  );
}

export function DataList({ columns, rows }: { columns: DataColumn[]; rows: Record<string, string>[] }) {
  return (
    <div className="data-list">
      <div className="table-scroll">
        <table className="wh-table list-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${row.id ?? "row"}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{row[column.key] ?? "-"}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  조회된 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
