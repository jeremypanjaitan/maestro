"use client";

import { useState } from "react";
import type { PayrollStatus } from "@prisma/client";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { setPayrollStatus } from "@/lib/actions/payroll";
import { PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayrollStatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PayrollRecord = {
  id: string;
  teacherName: string;
  periodMonth: number;
  periodYear: number;
  status: PayrollStatus;
  total: number;
  itemCount: number;
};

type PayrollTableProps = {
  payrolls: PayrollRecord[];
};

/** Row action target: which payroll, and which status it would move to. */
type TransitionTarget = { payroll: PayrollRecord; nextStatus: PayrollStatus };

export function PayrollTable({ payrolls }: PayrollTableProps) {
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirmTransition() {
    if (!transitionTarget) return;
    setIsPending(true);
    const result = await setPayrollStatus(transitionTarget.payroll.id, transitionTarget.nextStatus);
    setIsPending(false);

    if (result.ok) {
      toast.success(
        `Status diubah menjadi ${PAYROLL_STATUS_LABELS[transitionTarget.nextStatus]}`,
      );
      setTransitionTarget(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guru</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jumlah Sesi</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada payroll.
                    </TableCell>
                  </TableRow>
                ) : (
                  payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">{payroll.teacherName}</TableCell>
                      <TableCell>{formatPeriod(payroll.periodMonth, payroll.periodYear)}</TableCell>
                      <TableCell>{payroll.itemCount}</TableCell>
                      <TableCell className="text-right">{formatRupiah(payroll.total)}</TableCell>
                      <TableCell>
                        <PayrollStatusBadge status={payroll.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                              <span className="sr-only">Aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/payroll/${payroll.id}`}>Lihat detail</Link>
                            </DropdownMenuItem>
                            {payroll.status === "DRAFT" ? (
                              <DropdownMenuItem
                                onSelect={() =>
                                  setTransitionTarget({ payroll, nextStatus: "APPROVED" })
                                }
                              >
                                Approve
                              </DropdownMenuItem>
                            ) : null}
                            {payroll.status === "APPROVED" ? (
                              <DropdownMenuItem
                                onSelect={() => setTransitionTarget({ payroll, nextStatus: "PAID" })}
                              >
                                Tandai Dibayar
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={transitionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setTransitionTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {transitionTarget?.nextStatus === "PAID"
                ? "Tandai payroll sebagai dibayar?"
                : "Setujui payroll ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {transitionTarget
                ? `Payroll ${transitionTarget.payroll.teacherName} — ${formatPeriod(
                    transitionTarget.payroll.periodMonth,
                    transitionTarget.payroll.periodYear,
                  )} (${formatRupiah(transitionTarget.payroll.total)}) akan diubah menjadi ${PAYROLL_STATUS_LABELS[transitionTarget.nextStatus]}.`
                : null}
              {transitionTarget?.nextStatus === "PAID"
                ? " Setelah dibayar, payroll ini terkunci dan tidak bisa diubah lagi."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransition} disabled={isPending}>
              {isPending ? "Memproses..." : "Ya, lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type PayrollStatusActionsProps = {
  payroll: PayrollRecord;
};

/** Status transition buttons for the payroll detail page: Approve
 * (DRAFT->APPROVED), Tandai Dibayar (APPROVED->PAID), and Kembalikan ke Draft
 * (APPROVED->DRAFT, admin correction). Renders nothing once PAID (locked). */
export function PayrollStatusActions({ payroll }: PayrollStatusActionsProps) {
  const [pendingStatus, setPendingStatus] = useState<PayrollStatus | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    if (!pendingStatus) return;
    setIsPending(true);
    const result = await setPayrollStatus(payroll.id, pendingStatus);
    setIsPending(false);

    if (result.ok) {
      toast.success(`Status diubah menjadi ${PAYROLL_STATUS_LABELS[pendingStatus]}`);
      setPendingStatus(null);
    } else {
      toast.error(result.error);
    }
  }

  if (payroll.status === "PAID") {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {payroll.status === "DRAFT" ? (
          <Button onClick={() => setPendingStatus("APPROVED")}>Approve</Button>
        ) : null}
        {payroll.status === "APPROVED" ? (
          <>
            <Button onClick={() => setPendingStatus("PAID")}>Tandai Dibayar</Button>
            <Button variant="outline" onClick={() => setPendingStatus("DRAFT")}>
              Kembalikan ke Draft
            </Button>
          </>
        ) : null}
      </div>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah status payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus
                ? `Status akan diubah dari ${PAYROLL_STATUS_LABELS[payroll.status]} menjadi ${PAYROLL_STATUS_LABELS[pendingStatus]}.`
                : null}
              {pendingStatus === "PAID"
                ? " Setelah dibayar, payroll ini terkunci dan tidak bisa diubah lagi."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={isPending}>
              {isPending ? "Memproses..." : "Ya, lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
