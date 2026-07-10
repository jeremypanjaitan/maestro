"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "ALL";

export type ReportFilterOption = { id: string; name: string };

type ReportFiltersProps = {
  teachers: ReportFilterOption[];
  students: ReportFilterOption[];
  from?: string;
  to?: string;
  teacherId?: string;
  studentId?: string;
};

/**
 * Admin-only filter bar for `/admin/reports`: date-from, date-to, teacher,
 * student. Updates the `from`/`to`/`teacherId`/`studentId` search params via
 * client-side navigation, so the server page re-fetches every recap (all 4
 * tabs) with the new filters.
 */
export function ReportFilters({ teachers, students, from, to, teacherId, studentId }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: "from" | "to" | "teacherId" | "studentId", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="report-from">Dari</Label>
        <Input
          id="report-from"
          type="date"
          className="w-40"
          defaultValue={from ?? ""}
          onBlur={(e) => updateParam("from", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="report-to">Sampai</Label>
        <Input
          id="report-to"
          type="date"
          className="w-40"
          defaultValue={to ?? ""}
          onBlur={(e) => updateParam("to", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Guru</Label>
        <Select value={teacherId ?? ALL} onValueChange={(value) => updateParam("teacherId", value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Guru" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Guru</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Murid</Label>
        <Select value={studentId ?? ALL} onValueChange={(value) => updateParam("studentId", value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Murid" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Murid</SelectItem>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
