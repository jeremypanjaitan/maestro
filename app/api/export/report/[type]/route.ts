import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  getAttendanceRecap,
  getTeachingHoursRecap,
  getStudentProgressRecap,
  getPayrollRecap,
  type ReportFilters,
} from "@/lib/queries/reports";
import { buildReportWorkbook } from "@/lib/export/excel";
import { renderReportPdf } from "@/lib/export/pdf";
import type { ReportExportMeta, ReportRow, ReportType } from "@/lib/export/types";
import { formatRupiah } from "@/lib/utils";

// @react-pdf/renderer and exceljs are Node-only libraries; this route must
// run on the Node runtime (not Edge) and must not be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_TYPES: ReportType[] = ["attendance", "hours", "progress", "payroll"];

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as string[]).includes(value);
}

type RouteParams = {
  params: Promise<{ type: string }>;
};

/** Builds the {rows, meta} pair passed to the export builders, one branch
 * per recap shape. Kept in the route (not the export libs) since it's where
 * recap-specific field names get mapped onto generic column keys. */
async function loadReportData(
  type: ReportType,
  filters: ReportFilters,
): Promise<{ rows: ReportRow[]; meta: ReportExportMeta }> {
  if (type === "attendance") {
    const recap = await getAttendanceRecap(filters);
    return {
      rows: recap.details.map((row) => ({
        date: row.date,
        teacherName: row.teacherName,
        studentName: row.studentName,
        statusLabel: row.statusLabel,
      })),
      meta: {
        columns: [
          { key: "date", header: "Tanggal" },
          { key: "teacherName", header: "Guru" },
          { key: "studentName", header: "Murid" },
          { key: "statusLabel", header: "Status" },
        ],
        summary: [
          { label: "Total", value: String(recap.total) },
          { label: "Hadir", value: String(recap.counts.HADIR) },
          { label: "Murid Tidak Hadir", value: String(recap.counts.MURID_TIDAK_HADIR) },
          { label: "Guru Tidak Hadir", value: String(recap.counts.GURU_TIDAK_HADIR) },
          { label: "Reschedule", value: String(recap.counts.RESCHEDULE) },
          { label: "Cancel", value: String(recap.counts.CANCEL) },
          { label: "Terjadwal", value: String(recap.counts.SCHEDULED) },
        ],
      },
    };
  }

  if (type === "hours") {
    const recap = await getTeachingHoursRecap(filters);
    return {
      rows: recap.rows.map((row) => ({
        teacherName: row.teacherName,
        totalSessions: row.totalSessions,
        hadirSessions: row.hadirSessions,
        totalHours: row.totalHours,
      })),
      meta: {
        columns: [
          { key: "teacherName", header: "Guru" },
          { key: "totalSessions", header: "Total Sesi" },
          { key: "hadirSessions", header: "Hadir" },
          { key: "totalHours", header: "Total Jam" },
        ],
        summary: [
          { label: "Total Sesi", value: String(recap.grandTotalSessions) },
          { label: "Hadir", value: String(recap.grandTotalHadir) },
          { label: "Total Jam", value: String(Math.round((recap.grandTotalMinutes / 60) * 100) / 100) },
        ],
      },
    };
  }

  if (type === "progress") {
    const recap = await getStudentProgressRecap(filters);
    return {
      rows: recap.rows.map((row) => ({
        studentName: row.studentName,
        totalSessions: row.totalSessions,
        hadirSessions: row.hadirSessions,
        reportCount: row.reportCount,
        latestReportDate: row.latestReportDate ?? "-",
        latestGrade: row.latestGrade ?? "-",
      })),
      meta: {
        columns: [
          { key: "studentName", header: "Murid" },
          { key: "totalSessions", header: "Total Sesi" },
          { key: "hadirSessions", header: "Hadir" },
          { key: "reportCount", header: "Laporan" },
          { key: "latestReportDate", header: "Laporan Terakhir" },
          { key: "latestGrade", header: "Nilai Terakhir" },
        ],
        summary: [{ label: "Total Murid", value: String(recap.rows.length) }],
      },
    };
  }

  const recap = await getPayrollRecap(filters);
  return {
    rows: recap.rows.map((row) => ({
      teacherName: row.teacherName,
      period: row.period,
      statusLabel: row.statusLabel,
      total: formatRupiah(row.total),
    })),
    meta: {
      columns: [
        { key: "teacherName", header: "Guru" },
        { key: "period", header: "Periode" },
        { key: "statusLabel", header: "Status" },
        { key: "total", header: "Total" },
      ],
      summary: [{ label: "Grand Total", value: formatRupiah(recap.grandTotal) }],
    },
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { type } = await params;

  if (!isReportType(type)) {
    return new Response("Not found", { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filters: ReportFilters = {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    teacherId: searchParams.get("teacherId") || undefined,
    studentId: searchParams.get("studentId") || undefined,
  };
  const format = searchParams.get("format") === "excel" ? "excel" : "pdf";

  const { rows, meta } = await loadReportData(type, filters);
  const filenameBase = `laporan-${type}`;

  if (format === "excel") {
    const buffer = await buildReportWorkbook(type, rows, meta);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const buffer = await renderReportPdf(type, rows, meta);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
