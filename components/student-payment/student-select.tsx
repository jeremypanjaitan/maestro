"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Student picker for the admin Pembayaran Murid page. Selecting a student
 * navigates to `/admin/student-payments?studentId=<id>`.
 */
export function StudentPaymentStudentSelect({
  students,
  value,
}: {
  students: { id: string; name: string }[];
  value: string | null;
}) {
  const router = useRouter();

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(id) => router.push(`/admin/student-payments?studentId=${id}`)}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Pilih murid" />
      </SelectTrigger>
      <SelectContent>
        {students.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
