"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteHonorPayment } from "@/lib/actions/honor";
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
 * Delete action on the payment detail page. On success, navigates back to the
 * honor list (the deleted payment's detail route no longer exists).
 */
export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    const result = await deleteHonorPayment(paymentId);
    if (result.ok) {
      toast.success("Pembayaran dihapus");
      router.push("/admin/honor");
      router.refresh();
    } else {
      setIsDeleting(false);
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-4" />
          Hapus
        </Button>
      </AlertDialogTrigger>
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
  );
}
