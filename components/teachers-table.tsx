"use client";

import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { setTeacherStatus } from "@/lib/actions/teacher";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { TeacherForm, type TeacherRecord } from "@/components/teacher-form";

type TeachersTableProps = {
  teachers: TeacherRecord[];
};

export function TeachersTable({ teachers }: TeachersTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [toggleTarget, setToggleTarget] = useState<TeacherRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  function openCreateDialog() {
    setEditingTeacher(null);
    setFormOpen(true);
  }

  function openEditDialog(teacher: TeacherRecord) {
    setEditingTeacher(teacher);
    setFormOpen(true);
  }

  async function confirmToggleStatus() {
    if (!toggleTarget) return;
    setIsToggling(true);
    const nextStatus = toggleTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setTeacherStatus(toggleTarget.id, nextStatus);
    setIsToggling(false);

    if (result.ok) {
      toast.success(
        nextStatus === "ACTIVE" ? "Guru diaktifkan" : "Guru dinonaktifkan",
      );
      setToggleTarget(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Kelola Guru
        </h1>
        <Button onClick={openCreateDialog}>
          <Plus />
          Tambah Guru
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Instrumen</TableHead>
              <TableHead>Tarif/Sesi</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada guru.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.instruments.map((instrument) => (
                        <Badge key={instrument} variant="secondary">
                          {instrument}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatRupiah(teacher.ratePerSession)}</TableCell>
                  <TableCell>{teacher.phone ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.status === "ACTIVE" ? "default" : "outline"}>
                      {teacher.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
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
                        <DropdownMenuItem onSelect={() => openEditDialog(teacher)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setToggleTarget(teacher)}>
                          {teacher.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
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

      <TeacherForm open={formOpen} onOpenChange={setFormOpen} teacher={editingTeacher} />

      <AlertDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.status === "ACTIVE" ? "Nonaktifkan guru?" : "Aktifkan guru?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.status === "ACTIVE"
                ? `${toggleTarget?.name} tidak akan bisa login dan tidak akan muncul di jadwal baru.`
                : `${toggleTarget?.name} akan bisa login kembali.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleStatus} disabled={isToggling}>
              {isToggling ? "Memproses..." : "Ya, lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
