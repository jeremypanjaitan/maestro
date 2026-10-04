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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ClassType } from "@prisma/client";

/** Local YYYY-MM-DD for the default payment date (today). */
function todayLocalISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

type Mode = "sessions" | "package";

/** Default kwitansi line for a package paid in advance. */
function packageDescription(
  instrument: string,
  classType: ClassType,
  count: string,
): string {
  const kelas = classType === "GROUP" ? "group" : "private";
  return `Pembayaran les ${instrument.toLowerCase()} sesi ${kelas} untuk ${count || "…"} pertemuan`;
}

/**
 * Create-payment dialog for the admin Pembayaran Murid page. The admin ticks
 * which unpaid sessions the payment covers — past ones (bayar di akhir) or
 * upcoming SCHEDULED ones (bayar di awal). The amount follows the summed rate
 * of the ticked sessions until the admin edits it by hand.
 *
 * "Paket di awal" mode covers a payment made before any session exists: no
 * sessions are ticked; the kwitansi shows a single description line instead
 * (auto-written from instrument / jenis kelas / jumlah pertemuan, editable).
 */
export function CreateStudentPaymentDialog({
  studentId,
  studentName,
  studentInstrument,
  sessions,
}: {
  studentId: string;
  studentName: string;
  studentInstrument: string;
  sessions: UnpaidStudentSession[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState<Mode>("sessions");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [classType, setClassType] = useState<ClassType>("PRIVATE");
  const [meetingCount, setMeetingCount] = useState("4");
  const [description, setDescription] = useState("");
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [paidAtISO, setPaidAtISO] = useState("");
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);

  const today = todayLocalISO();

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setMode(sessions.length === 0 ? "package" : "sessions");
      setSelected(new Set());
      setClassType("PRIVATE");
      setMeetingCount("4");
      setDescriptionEdited(false);
      setAmount("");
      setAmountEdited(false);
      setPaidAtISO(todayLocalISO());
      setNote("");
    }
  }, [open, sessions.length]);

  const selectedRateSum = useMemo(
    () =>
      sessions
        .filter((s) => selected.has(s.id))
        .reduce((sum, s) => sum + s.rate, 0),
    [sessions, selected],
  );

  // Auto-fill the amount from the ticked sessions until edited by hand.
  useEffect(() => {
    if (mode === "sessions" && !amountEdited) {
      setAmount(selectedRateSum > 0 ? String(selectedRateSum) : "");
    }
  }, [mode, selectedRateSum, amountEdited]);

  // Auto-write the package description until edited by hand.
  useEffect(() => {
    if (!descriptionEdited) {
      setDescription(
        packageDescription(studentInstrument, classType, meetingCount),
      );
    }
  }, [studentInstrument, classType, meetingCount, descriptionEdited]);

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
    if (mode === "sessions" && selected.size === 0) {
      toast.error("Pilih minimal satu sesi");
      return;
    }

    setIsPending(true);
    const result = await createStudentPayment({
      studentId,
      sessionIds: mode === "sessions" ? Array.from(selected) : [],
      package:
        mode === "package"
          ? { description, meetingCount, classType }
          : undefined,
      amount,
      paidAtISO,
      note,
    });
    setIsPending(false);

    if (result.ok) {
      toast.success(
        `Pembayaran ${result.number} dibuat: ${result.itemCount} pertemuan`,
      );
      setOpen(false);
      router.push(`/admin/student-payments/${result.paymentId}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Catat Pembayaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Murid</DialogTitle>
          <DialogDescription>
            Pembayaran dari {studentName}: pilih sesinya, atau catat sebagai
            paket di awal kalau sesinya belum ada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="sessions">Pilih sesi</TabsTrigger>
              <TabsTrigger value="package">
                Paket di awal (tanpa sesi)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "package" ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Jenis Kelas</Label>
                  <Select
                    value={classType}
                    onValueChange={(v) => setClassType(v as ClassType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="GROUP">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sp-count">Jumlah Pertemuan</Label>
                  <Input
                    id="sp-count"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={meetingCount}
                    onChange={(e) => setMeetingCount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sp-desc">Keterangan di Kwitansi</Label>
                <Textarea
                  id="sp-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDescriptionEdited(true);
                  }}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Pertemuan yang dibayar ({selected.size} dipilih)</Label>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                {sessions.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Tidak ada sesi yang belum dibayar. Pakai tab &ldquo;Paket di awal&rdquo; kalau sesinya belum dibuat.
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
                          <span className="flex-1 truncate text-muted-foreground">
                            {s.teacherName}
                            {s.status === "SCHEDULED" &&
                              s.dateStr >= today &&
                              " · akan datang"}
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
          )}

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
              {mode === "sessions" &&
                amountEdited &&
                selectedRateSum > 0 &&
                Number(amount) !== selectedRateSum && (
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
            <Label htmlFor="sp-note">
              Catatan (opsional, tampil di kwitansi)
            </Label>
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
