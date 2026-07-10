"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "ALL";

export type CalendarFilterOption = { id: string; name: string };

type CalendarFiltersProps = {
  teachers: CalendarFilterOption[];
  students: CalendarFilterOption[];
  teacherId?: string;
  studentId?: string;
};

/** Admin-only filter bar for the schedule calendar. Updates `teacherId` /
 * `studentId` search params (preserving `week`) via client-side navigation;
 * the server page re-fetches with the new filters. */
export function CalendarFilters({
  teachers,
  students,
  teacherId,
  studentId,
}: CalendarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: "teacherId" | "studentId", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={teacherId ?? ALL}
        onValueChange={(value) => updateParam("teacherId", value)}
      >
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

      <Select
        value={studentId ?? ALL}
        onValueChange={(value) => updateParam("studentId", value)}
      >
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
  );
}
