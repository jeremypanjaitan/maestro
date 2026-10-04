"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createStudentPayment } from "@/lib/actions/student-payment";
import type { UnpaidStudentSession } from "@/lib/queries/student-payment";
import { formatRupiah } from "@/lib/utils";
import { SessionStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Local YYYY-MM-DD for the default payment date (today). */
function todayLocalISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Create-payment dialog for the admin Pembayaran Murid page. The admin ticks
 * which unpaid sessions the payment covers — past ones (bayar di akhir) or
 * upcoming SCHEDULED ones (bayar di awal). The amount follows the summed rate
 * of the ticked sessions until the admin edits it by hand.
 */
export function CreateStudentPaymentDialog({
  studentId,
  studentName,
  sessions,
}: {
  studentId: string;
  studentName: string;
  sessions: UnpaidStudentSession[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [paidAtISO, setPaidAtISO] = useState("");
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);

  const today = todayLocalISO();

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setAmount("");
      setAmountEdited(false);
      setPaidAtISO(todayLocalISO());
      setNote("");
    }
  }, [open]);

  const selectedRateSum = useMemo(
    () =>
      sessions
        .filter((s) => selected.has(s.id))
        .reduce((sum, s) => sum + s.rate, 0),
    [sessions, selected],
  );

  // Auto-fill the amount from the ticked sessions until edited by hand.
  useEffect(() => {
    if (!amountEdited) setAmount(selectedRateSum > 0 ? String(selectedRateSum) : "");
  }, [selectedRateSum, amountEdited]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      toast.error("Pilih minimal satu sesi");
      return;
    }

    setIsPending(true);
    const result = await createStudentPayment({
      studentId,
      sessionIds: Array.from(selected),
      amount,
      paidAtISO,
      note,
    });
    setIsPending(false);

    if (result.ok) {
      toast.success(`Pembayaran ${result.number} dibuat: ${result.itemCount} sesi`);
      setOpen(false);
      router.push(`/admin/student-payments/${result.paymentId}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={sessions.length === 0}>
          <Plus className="size-4" />
          Catat Pembayaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Murid</DialogTitle>
          <DialogDescription>
            Pilih pertemuan yang dibayar oleh {studentName}. Sesi yang belum
            terjadi juga bisa dipilih untuk pembayaran di awal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Pertemuan yang dibayar ({selected.size} dipilih)</Label>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {sessions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Tidak ada sesi yang belum dibayar. Generate sesi bulan depan
                  dulu untuk pembayaran di awal.
                </p>
              ) : (
                <ul className="divide-y">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/50">
                        <Checkbox
                          checked={selected.has(s.id)}
                          onCheckedChange={() => toggle(s.id)}
                        />
                        <span className="w-24 shrink-0 tabular-nums">{s.dateStr}</span>
                        <span className="w-12 shrink-0 tabular-nums">{s.startTime}</span>
                        <span className="flex-1 truncate text-muted-foreground">
                          {s.teacherName}
                          {s.status === "SCHEDULED" && s.dateStr >= today && " · akan datang"}
                        </span>
                        <SessionStatusBadge status={s.status} />
                        {s.rate > 0 && (
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {formatRupiah(s.rate)}
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sp-amount">Total Dibayar (Rp)</Label>
              <Input
                id="sp-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountEdited(true);
                }}
                required
              />
              {amountEdited && selectedRateSum > 0 && Number(amount) !== selectedRateSum && (
                <button
                  type="button"
                  className="text-left text-xs text-muted-foreground underline"
                  onClick={() => setAmountEdited(false)}
                >
                  Pakai total tarif sesi ({formatRupiah(selectedRateSum)})
                </button>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sp-date">Tanggal Bayar</Label>
              <Input
                id="sp-date"
                type="date"
                value={paidAtISO}
                onChange={(e) => setPaidAtISO(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sp-note">Catatan (opsional, tampil di kwitansi)</Label>
            <Textarea
              id="sp-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. transfer BCA"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
