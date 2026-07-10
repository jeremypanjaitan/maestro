import ExcelJS from "exceljs";

import { formatDbDate } from "@/lib/domain/dbDate";
import { PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";

import { REPORT_TITLES } from "./types";
import type { PayrollExportData, ReportExportMeta, ReportRow, ReportType } from "./types";

/**
 * Builds an .xlsx workbook for a single payroll: a header block (teacher,
 * period, status), a table of items (No, Tanggal, Murid, Jam, Rate), and a
 * total row. Node-only (exceljs) — only ever import this from a route
 * handler or another server-only module.
 */
export async function buildPayrollWorkbook(payroll: PayrollExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maestro";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Payroll");
  const period = formatPeriod(payroll.periodMonth, payroll.periodYear);

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "tanggal", width: 14 },
    { key: "murid", width: 28 },
    { key: "jam", width: 10 },
    { key: "rate", width: 18 },
  ];

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = `Payroll — ${payroll.teacherName}`;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:E2");
  sheet.getCell("A2").value = `Periode: ${period}`;

  sheet.mergeCells("A3:E3");
  sheet.getCell("A3").value = `Status: ${PAYROLL_STATUS_LABELS[payroll.status]}`;

  sheet.addRow([]);

  const headerRow = sheet.addRow(["No", "Tanggal", "Murid", "Jam", "Rate"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { bottom: { style: "thin" } };
  });

  payroll.items.forEach((item, index) => {
    sheet.addRow([
      index + 1,
      formatDbDate(item.date),
      item.studentName,
      item.startTime,
      formatRupiah(item.rate),
    ]);
  });

  const totalRow = sheet.addRow(["", "", "", "Total", formatRupiah(payroll.total)]);
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Builds an .xlsx workbook for a generic recap (Task 22 "Laporan"): a title
 * block (+ optional subtitle), a header row from `meta.columns`, one row per
 * `data` entry, and optional summary rows (e.g. grand totals). Generic over
 * the 4 recap shapes (attendance/hours/progress/payroll) — callers just
 * supply columns + rows. Node-only (exceljs) — only ever import this from a
 * route handler or another server-only module.
 */
export async function buildReportWorkbook(
  type: ReportType,
  data: ReportRow[],
  meta: ReportExportMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maestro";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan");
  const title = meta.title ?? REPORT_TITLES[type];
  const colCount = meta.columns.length;

  sheet.columns = meta.columns.map((column) => ({ key: column.key, width: 22 }));

  const lastColLetter = sheet.getColumn(colCount).letter;

  sheet.mergeCells(`A1:${lastColLetter}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  if (meta.subtitle) {
    sheet.mergeCells(`A2:${lastColLetter}2`);
    sheet.getCell("A2").value = meta.subtitle;
  }

  sheet.addRow([]);

  const headerRow = sheet.addRow(meta.columns.map((column) => column.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { bottom: { style: "thin" } };
  });

  for (const row of data) {
    sheet.addRow(meta.columns.map((column) => row[column.key] ?? ""));
  }

  if (meta.summary?.length) {
    sheet.addRow([]);
    for (const item of meta.summary) {
      const summaryRow = sheet.addRow([item.label, item.value]);
      summaryRow.font = { bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
