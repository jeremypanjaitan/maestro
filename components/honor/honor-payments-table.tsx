"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteHonorPayment } from "@/lib/actions/honor";
import type { HonorPaymentRow } from "@/lib/queries/honor";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/**
 * Payment-history table shared by the admin and guru honor pages. Each row
 * links to `${basePath}/${id}` for detail. When `canDelete` is set (admin),
 * a delete action is shown — deleting cascades away the payment and reverts
 * its sessions to "belum dibayar".
 */
export function HonorPaymentsTable({
  payments,
  basePath,
  canDelete = false,
}: {
  payments: HonorPaymentRow[];
  basePath: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    const result = await deleteHonorPayment(pendingDeleteId);
    setIsDeleting(false);
    setPendingDeleteId(null);
    if (result.ok) {
      toast.success("Pembayaran dihapus");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="text-center">Sesi</TableHead>
              <TableHead className="text-center">Bukti</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada pembayaran.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="tabular-nums">{p.paidAtStr}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatRupiah(p.amount)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.itemCount}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.proofCount}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {p.note ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`${basePath}/${p.id}`}>Detail</Link>
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingDeleteId(p.id)}
                          aria-label="Hapus pembayaran"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => !o && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembayaran, bukti, dan kaitannya dengan sesi akan dihapus permanen.
              Sesi yang tercakup akan kembali berstatus belum dibayar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Ya, hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
