"use client";

import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { toggleSchedule } from "@/lib/actions/schedule";
import { DAY_LABELS } from "@/lib/validations/schedule";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ClassTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ScheduleForm,
  type ScheduleRecord,
  type ScheduleStudentOption,
  type ScheduleTeacherOption,
} from "@/components/schedule-form";

export type ScheduleWithRelations = ScheduleRecord & {
  teacher: { name: string };
  student: { name: string };
};

type SchedulesTableProps = {
  schedules: ScheduleWithRelations[];
  teachers: ScheduleTeacherOption[];
  students: ScheduleStudentOption[];
};

export function SchedulesTable({ schedules, teachers, students }: SchedulesTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithRelations | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ScheduleWithRelations | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  function openCreateDialog() {
    setEditingSchedule(null);
    setFormOpen(true);
  }

  function openEditDialog(schedule: ScheduleWithRelations) {
    setEditingSchedule(schedule);
    setFormOpen(true);
  }

  async function confirmToggleActive() {
    if (!toggleTarget) return;
    setIsToggling(true);
    const result = await toggleSchedule(toggleTarget.id);
    setIsToggling(false);

    if (result.ok) {
      toast.success(toggleTarget.active ? "Jadwal dinonaktifkan" : "Jadwal diaktifkan");
      setToggleTarget(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Jadwal"
        description="Jadwal mingguan berulang yang menjadi sumber generate sesi."
      >
        <Button onClick={openCreateDialog}>
          <Plus />
          Tambah Jadwal
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guru</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Belum ada jadwal.
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.teacher.name}</TableCell>
                      <TableCell>{schedule.student.name}</TableCell>
                      <TableCell>{schedule.instrument}</TableCell>
                      <TableCell>{DAY_LABELS[schedule.dayOfWeek]}</TableCell>
                      <TableCell>{schedule.startTime}</TableCell>
                      <TableCell>{schedule.durationMinutes} menit</TableCell>
                      <TableCell>
                        <ClassTypeBadge classType={schedule.classType} />
                      </TableCell>
                      <TableCell className="text-right">{formatRupiah(schedule.rate)}</TableCell>
                      <TableCell>
                        <Badge variant={schedule.active ? "default" : "outline"}>
                          {schedule.active ? "Aktif" : "Nonaktif"}
                        </Badge>
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
                            <DropdownMenuItem onSelect={() => openEditDialog(schedule)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setToggleTarget(schedule)}>
                              {schedule.active ? "Nonaktifkan" : "Aktifkan"}
                            </DropdownMenuItem>
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

      <ScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={editingSchedule}
        teachers={teachers}
        students={students}
      />

      <AlertDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.active ? "Nonaktifkan jadwal?" : "Aktifkan jadwal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.active
                ? `Jadwal ${toggleTarget?.teacher.name} - ${toggleTarget?.student.name} tidak akan menghasilkan sesi baru.`
                : `Jadwal ${toggleTarget?.teacher.name} - ${toggleTarget?.student.name} akan aktif kembali.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive} disabled={isToggling}>
              {isToggling ? "Memproses..." : "Ya, lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
