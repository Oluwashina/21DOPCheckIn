const REPORT_TIME_ZONE = "Africa/Lagos";

function formatReportTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: REPORT_TIME_ZONE,
  });
}

/** Human-readable date/time for exports and admin reports (WAT). */
export function formatReportDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const datePart = new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: REPORT_TIME_ZONE,
  });
  return `${datePart}, ${formatReportTime(iso)}`;
}

/** Short time for team lead views — time only if today, else date + time. */
export function formatCheckInTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay =
    date.toLocaleDateString("en-CA", { timeZone: REPORT_TIME_ZONE }) ===
    now.toLocaleDateString("en-CA", { timeZone: REPORT_TIME_ZONE });
  if (sameDay) return formatReportTime(iso);
  return formatReportDateTime(iso);
}

function escapeCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(headers: string[], rows: (string | number | boolean)[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

/** Triggers a client-side download — no server round trip needed. */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
