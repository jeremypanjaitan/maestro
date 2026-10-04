"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteStudentPayment } from "@/lib/actions/student-payment";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Deletes a student payment. When `redirectTo` is set (detail page), navigates
 * there afterwards since the deleted payment's route no longer exists.
 */
export function DeleteStudentPaymentButton({
  paymentId,
  redirectTo,
  iconOnly = false,
}: {
  paymentId: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    const result = await deleteStudentPayment(paymentId);
    setIsDeleting(false);
    if (result.ok) {
      toast.success("Pembayaran dihapus");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Hapus pembayaran">
          <Trash2 className="size-4" />
          {!iconOnly && "Hapus"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pembayaran?</AlertDialogTitle>
          <AlertDialogDescription>
            Pembayaran dan kwitansinya akan dihapus permanen. Sesi yang tercakup
            akan kembali berstatus belum dibayar. Nomor kwitansi tidak dipakai
            ulang.
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
  );
}
