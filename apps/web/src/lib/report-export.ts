import type { ReportSummary } from "./reports-api";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("ko-KR") : "-";
}

function cell(value: string | number, tag: "td" | "th" = "td"): string {
  const text = typeof value === "number" ? formatNumber(value) : value;

  return `<${tag}>${escapeHtml(text)}</${tag}>`;
}

export function buildSummaryClipboardText(summary: ReportSummary): string {
  const weeklyRows = summary.summaryTable.rows
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

  const comparisonRows = summary.comparisonTable.rows
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

  return [
    summary.summaryTable.title,
    [
      "법인 유형",
      "타겟 구분",
      "이전 온보딩수",
      "이전 예치금",
      "이전 거래대금",
      "현재 온보딩수",
      "현재 예치금",
      "현재 거래대금",
    ].join("\t"),
    weeklyRows,
    "",
    summary.comparisonTable.title,
    ["일자", "합계", "1단계", "2단계", "3단계", "기타", "예치금(백만원)", "거래대금(백만원)"].join(
      "\t",
    ),
    comparisonRows,
    "",
    summary.sentenceSummary.title,
    summary.sentenceSummary.lines.join("\n"),
  ].join("\n");
}

export function exportSummaryAsExcel(summary: ReportSummary): void {
  const weeklyRows = summary.summaryTable.rows
    .map((row) =>
      [
        cell(row.corpType),
        cell(row.targetGroup || "-"),
        cell(row.previous.onboardingCount),
        cell(row.previous.balanceKrw),
        cell(row.previous.transactionKrw),
        cell(row.current.onboardingCount),
        cell(row.current.balanceKrw),
        cell(row.current.transactionKrw),
      ].join(""),
    )
    .map((row) => `<tr>${row}</tr>`)
    .join("");

  const comparisonRows = summary.comparisonTable.rows
    .map((row) =>
      [
        cell(row.label),
        cell(row.total),
        cell(row.stage1),
        cell(row.stage2),
        cell(row.stage3),
        cell(row.etc),
        cell(row.balanceMillionKrw),
        cell(row.transactionMillionKrw),
      ].join(""),
    )
    .map((row) => `<tr>${row}</tr>`)
    .join("");

  const sentenceRows = summary.sentenceSummary.lines
    .map((line) => `<tr>${cell(line)}</tr>`)
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
    th, td { border: 1px solid #d9dde3; padding: 8px; white-space: nowrap; }
    th { background: #f5f6f7; font-weight: 700; }
    .title { font-size: 14pt; font-weight: 700; border: 0; padding: 14px 0 8px; }
    .gap td { border: 0; height: 16px; }
  </style>
</head>
<body>
  <table>
    <tr><td class="title" colspan="8">${escapeHtml(summary.summaryTable.title)}</td></tr>
    <tr>
      ${cell("법인 유형", "th")}
      ${cell("타겟 구분", "th")}
      ${cell(`${summary.summaryTable.previousLabel} 온보딩수`, "th")}
      ${cell(`${summary.summaryTable.previousLabel} 예치금(원)`, "th")}
      ${cell(`${summary.summaryTable.previousLabel} 거래대금(원)`, "th")}
      ${cell(`${summary.summaryTable.currentLabel} 온보딩수`, "th")}
      ${cell(`${summary.summaryTable.currentLabel} 예치금(원)`, "th")}
      ${cell(`${summary.summaryTable.currentLabel} 거래대금(원)`, "th")}
    </tr>
    ${weeklyRows}
    <tr class="gap"><td colspan="8"></td></tr>
    <tr><td class="title" colspan="8">${escapeHtml(summary.comparisonTable.title)}</td></tr>
    <tr>
      ${cell("일자", "th")}
      ${cell("합계", "th")}
      ${cell("1단계", "th")}
      ${cell("2단계", "th")}
      ${cell("3단계", "th")}
      ${cell("기타", "th")}
      ${cell("예치금(백만원)", "th")}
      ${cell("거래대금(백만원)", "th")}
    </tr>
    ${comparisonRows}
    <tr class="gap"><td colspan="8"></td></tr>
    <tr><td class="title" colspan="8">${escapeHtml(summary.sentenceSummary.title)}</td></tr>
    ${sentenceRows}
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${summary.report.name}_summary.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
