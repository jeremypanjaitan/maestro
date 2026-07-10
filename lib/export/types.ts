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
