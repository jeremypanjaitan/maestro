"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import { createHonorPayment, type ProofInput } from "@/lib/actions/honor";
import {
  compressImageIfNeeded,
  fileToBase64,
  validateProofFile,
} from "@/lib/files";
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
import type { SessionStatus } from "@prisma/client";

export type SelectableSession = {
  id: string;
  dateStr: string;
  startTime: string;
  studentName: string;
  status: SessionStatus;
  rate: number;
};

/** Local YYYY-MM-DD for the default payment date (today). */
function todayLocalISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Create-payment dialog for the admin Pembayaran Honor page. The admin ticks
 * which of the teacher's unpaid sessions this payment covers, types the total
 * amount (manual — the summed rate of the ticked rows is shown only as a
 * hint), picks the payment date, and uploads at least one proof file. All
 * three (≥1 session, amount > 0, ≥1 proof) are required before submit.
 */
export function CreateHonorPaymentDialog({
  teacherId,
  teacherName,
  sessions,
}: {
  teacherId: string;
  teacherName: string;
  sessions: SelectableSession[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState("");
  const [paidAtISO, setPaidAtISO] = useState("");
  const [note, setNote] = useState("");
  const [proofs, setProofs] = useState<ProofInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setAmount("");
      setPaidAtISO(todayLocalISO());
      setNote("");
      setProofs([]);
    }
  }, [open]);

  const selectedRateSum = useMemo(
    () =>
      sessions
        .filter((s) => selected.has(s.id))
        .reduce((sum, s) => sum + s.rate, 0),
    [sessions, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const finalFile = await compressImageIfNeeded(file);
        const validation = validateProofFile(finalFile);
        if (!validation.ok) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }
        const dataBase64 = await fileToBase64(finalFile);
        setProofs((prev) => [
          ...prev,
          { filename: finalFile.name, mimeType: finalFile.type, dataBase64 },
        ]);
      }
    } catch {
      toast.error("Gagal membaca file");
    } finally {
      setIsUploading(false);
    }
  }

  function removeProof(index: number) {
    setProofs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      toast.error("Pilih minimal satu sesi");
      return;
    }
    if (proofs.length === 0) {
      toast.error("Unggah minimal satu bukti pembayaran");
      return;
    }

    setIsPending(true);
    const result = await createHonorPayment({
      teacherId,
      sessionIds: Array.from(selected),
      amount,
      paidAtISO,
      note,
      proofs,
    });
    setIsPending(false);

    if (result.ok) {
      toast.success(`Pembayaran dibuat: ${result.itemCount} sesi`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={sessions.length === 0}>
          <Plus className="size-4" />
          Buat Pembayaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat Pembayaran Honor</DialogTitle>
          <DialogDescription>
            Pilih sesi yang dibayar untuk {teacherName}, isi nominal, dan unggah
            bukti transfer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Sesi yang dibayar ({selected.size} dipilih)</Label>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {sessions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Tidak ada sesi yang belum dibayar.
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
                        <span className="w-24 shrink-0 tabular-nums">
                          {s.dateStr}
                        </span>
                        <span className="w-12 shrink-0 tabular-nums">
                          {s.startTime}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {s.studentName}
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
            {selectedRateSum > 0 && (
              <p className="text-xs text-muted-foreground">
                Total rate sesi terpilih: {formatRupiah(selectedRateSum)} (acuan
                — nominal tetap Anda isi manual)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="h-amount">Nominal Honor (Rp)</Label>
              <Input
                id="h-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="h-date">Tanggal Bayar</Label>
              <Input
                id="h-date"
                type="date"
                value={paidAtISO}
                onChange={(e) => setPaidAtISO(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="h-note">Catatan (opsional)</Label>
            <Textarea
              id="h-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. transfer BCA, ref #..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Bukti Pembayaran (wajib, gambar/PDF)</Label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFiles}
              disabled={isUploading}
              className="text-sm"
            />
            {isUploading && (
              <span className="text-xs text-muted-foreground">Membaca file...</span>
            )}
            {proofs.length > 0 && (
              <ul className="flex flex-col gap-1">
                {proofs.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <span className="truncate">{p.filename}</span>
                    <button
                      type="button"
                      onClick={() => removeProof(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Hapus bukti"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
