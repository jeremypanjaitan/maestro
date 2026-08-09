"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { HonorSessionRow } from "@/lib/queries/honor";
import { ClassTypeBadge, SessionStatusBadge, StatusBadge } from "@/components/status-badge";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Sudah dibayar" },
  { value: "unpaid", label: "Belum dibayar" },
];

/**
 * Status Sesi card for the admin + guru honor pages. Renders the
 * session-payment status table with multi-select "Murid" and "Status bayar"
 * filters (client-side — empty selection means all). The unpaid count in the
 * title reflects the current filter. `basePath` decides where a paid row
 * links for the payment detail (each role has its own route).
 */
export function SessionStatusTable({
  sessions,
  basePath,
}: {
  sessions: HonorSessionRow[];
  basePath: string;
}) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string[]>([]);

  // Distinct students among this teacher's sessions, for the filter options.
  const studentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of sessions) {
      if (!seen.has(s.studentId)) seen.set(s.studentId, s.studentName);
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [sessions]);

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        if (
          selectedStudents.length > 0 &&
          !selectedStudents.includes(s.studentId)
        ) {
          return false;
        }
        // Both selected behaves the same as none selected: no filtering.
        if (selectedPayment.length > 0) {
          return selectedPayment.includes(s.paid ? "paid" : "unpaid");
        }
        return true;
      }),
    [sessions, selectedStudents, selectedPayment],
  );

  const unpaidCount = filtered.filter((s) => !s.paid).length;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Status Sesi ({unpaidCount} belum dibayar)</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            options={studentOptions}
            selected={selectedStudents}
            onChange={setSelectedStudents}
            allLabel="Semua murid"
          />
          <MultiSelectFilter
            options={PAYMENT_OPTIONS}
            selected={selectedPayment}
            onChange={setSelectedPayment}
            allLabel="Semua status bayar"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Murid</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status Sesi</TableHead>
                <TableHead className="text-right">Pembayaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {sessions.length === 0
                      ? "Belum ada sesi untuk guru ini."
                      : "Tidak ada sesi yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums">{s.dateStr}</TableCell>
                    <TableCell className="tabular-nums">{s.startTime}</TableCell>
                    <TableCell className="font-medium">{s.studentName}</TableCell>
                    <TableCell>
                      <ClassTypeBadge classType={s.classType} />
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.paid && s.paymentId ? (
                        <Link href={`${basePath}/${s.paymentId}`} className="inline-block">
                          <StatusBadge label="Sudah dibayar" tone="green" />
                        </Link>
                      ) : (
                        <StatusBadge label="Belum dibayar" tone="amber" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
