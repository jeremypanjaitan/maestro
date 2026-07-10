import type { PayrollStatus } from "@prisma/client";

/**
 * Shape consumed by the payroll export builders (`excel.ts`, `pdf.tsx`).
 * Deliberately decoupled from the Prisma payload so the route handler
 * controls exactly what data crosses into the render layer, and so Task 22
 * (laporan export) can build/reuse similarly-shaped data without depending
 * on Prisma types directly.
 */
export type PayrollExportItem = {
  date: Date;
  studentName: string;
  startTime: string;
  rate: number;
};

export type PayrollExportData = {
  teacherName: string;
  periodMonth: number;
  periodYear: number;
  status: PayrollStatus;
  total: number;
  items: PayrollExportItem[];
};

/**
 * The four recap flavors Task 22 (Laporan) exports. Kept as a literal union
 * (rather than importing an enum) so the export libs stay decoupled from
 * `lib/queries/reports.ts` — they only need a generic table shape.
 */
export type ReportType = "attendance" | "hours" | "progress" | "payroll";

/** One column of a generic recap table: `key` looks up the cell value in
 * each row, `header` is the printed column title. */
export type ReportColumn = { key: string; header: string };

/** A generic recap row — cell values keyed by `ReportColumn.key`. */
export type ReportRow = Record<string, string | number>;

/**
 * Everything the generic report builders (`buildReportWorkbook`,
 * `renderReportPdf`) need beyond the rows themselves: table shape, an
 * optional subtitle (e.g. the active filter description), and optional
 * summary lines (e.g. grand totals) printed after the table. `title` is
 * optional — omitting it falls back to a per-`ReportType` default.
 */
export type ReportExportMeta = {
  title?: string;
  subtitle?: string;
  columns: ReportColumn[];
  summary?: { label: string; value: string }[];
};

/** Default title per recap, used when `ReportExportMeta.title` is omitted. */
export const REPORT_TITLES: Record<ReportType, string> = {
  attendance: "Rekap Absensi",
  hours: "Rekap Jam Mengajar",
  progress: "Rekap Perkembangan Murid",
  payroll: "Rekap Payroll",
};
