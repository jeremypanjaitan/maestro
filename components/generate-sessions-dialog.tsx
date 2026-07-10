"use client";

import { useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { toast } from "sonner";

import { generateSessions } from "@/lib/actions/session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export function GenerateSessionsDialog() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(defaultRange);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) setRange(defaultRange());
    setOpen(next);
  }

  async function handleGenerate() {
    setIsPending(true);
    const result = await generateSessions(range.from, range.to);
    setIsPending(false);

    if (result.ok) {
      toast.success(
        result.created > 0
          ? `${result.created} sesi baru dibuat`
          : "Tidak ada sesi baru (sudah dibuat sebelumnya)",
      );
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>Generate Sesi</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Sesi</DialogTitle>
            <DialogDescription>
              Membuat sesi dari jadwal aktif untuk rentang tanggal ini. Sesi
              yang sudah ada untuk jadwal &amp; tanggal yang sama tidak akan
              diduplikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from">Dari</Label>
              <Input
                id="from"
                type="date"
                value={range.from}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, from: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to">Sampai</Label>
              <Input
                id="to"
                type="date"
                value={range.to}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, to: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Memproses..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
