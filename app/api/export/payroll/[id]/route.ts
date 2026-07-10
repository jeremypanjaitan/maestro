import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPayrollWorkbook } from "@/lib/export/excel";
import { renderPayrollPdf } from "@/lib/export/pdf";
import type { PayrollExportData } from "@/lib/export/types";
import { getMeetingNumbersForTeacher } from "@/lib/queries/payroll";
import { formatPeriod } from "@/lib/utils";

// @react-pdf/renderer and exceljs are Node-only libraries; this route must
// run on the Node runtime (not Edge) and must not be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/** Strips characters that are unsafe in a Content-Disposition filename. */
function toFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;

  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      items: {
        include: {
          session: {
            select: {
              id: true,
              date: true,
              startTime: true,
              classType: true,
              student: { select: { name: true } },
            },
          },
        },
        orderBy: { session: { date: "asc" } },
      },
    },
  });

  if (!payroll) {
    return new Response("Not found", { status: 404 });
  }

  // Meeting numbers ("pertemuan ke-N") are computed against the teacher's
  // FULL session history so the exported numbers match what the detail
  // page shows — see `getMeetingNumbersForTeacher`.
  const meetingNumbers = await getMeetingNumbersForTeacher(payroll.teacherId);

  const exportData: PayrollExportData = {
    teacherName: payroll.teacher.name,
    periodMonth: payroll.periodMonth,
    periodYear: payroll.periodYear,
    status: payroll.status,
    total: payroll.total,
    items: payroll.items.map((item) => ({
      date: item.session.date,
      studentName: item.session.student.name,
      startTime: item.session.startTime,
      classType: item.session.classType,
      meetingNumber: meetingNumbers.get(item.session.id) ?? null,
      rate: item.rate,
    })),
  };

  const format = request.nextUrl.searchParams.get("format") === "excel" ? "excel" : "pdf";
  const period = formatPeriod(payroll.periodMonth, payroll.periodYear);
  const filenameBase = `payroll-${toFilenameSegment(payroll.teacher.name)}-${toFilenameSegment(period)}`;

  if (format === "excel") {
    const buffer = await buildPayrollWorkbook(exportData);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const buffer = await renderPayrollPdf(exportData);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
