"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";

import { moveStudentPaymentItem } from "@/lib/actions/student-payment";
import type { StudentPaymentCredit, UnpaidStudentSession } from "@/lib/queries/student-payment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Moves a credit (a paid meeting whose session was cancelled) onto another
 * unpaid session of the same student. The kwitansi then lists the new date.
 */
export function MoveCreditDialog({
  credit,
  sessions,
}: {
  credit: StudentPaymentCredit;
  sessions: UnpaidStudentSession[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    if (!target) {
      toast.error("Pilih sesi tujuan");
      return;
    }
    setIsPending(true);
    const result = await moveStudentPaymentItem(credit.itemId, target);
    setIsPending(false);
    if (result.ok) {
      toast.success("Kredit dipindahkan");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTarget("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={sessions.length === 0}>
          <ArrowRightLeft className="size-4" />
          Pindahkan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pindahkan Kredit</DialogTitle>
          <DialogDescription>
            Sesi {credit.dateStr} {credit.startTime} dibatalkan, tetapi sudah
            dibayar ({credit.paymentNumber}). Pilih sesi pengganti yang akan
            menerima pembayaran ini.
          </DialogDescription>
        </DialogHeader>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih sesi tujuan" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.dateStr} {s.startTime} · {s.teacherName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Pindahkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
