"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { setStudentStatus } from "@/lib/actions/student";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { StudentForm, type StudentRecord } from "@/components/student-form";

type StudentsTableProps = {
  students: StudentRecord[];
};

export function StudentsTable({ students }: StudentsTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [toggleTarget, setToggleTarget] = useState<StudentRecord | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  function openCreateDialog() {
    setEditingStudent(null);
    setFormOpen(true);
  }

  function openEditDialog(student: StudentRecord) {
    setEditingStudent(student);
    setFormOpen(true);
  }

  async function confirmToggleStatus() {
    if (!toggleTarget) return;
    setIsToggling(true);
    const nextStatus = toggleTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setStudentStatus(toggleTarget.id, nextStatus);
    setIsToggling(false);

    if (result.ok) {
      toast.success(
        nextStatus === "ACTIVE" ? "Murid diaktifkan" : "Murid dinonaktifkan",
      );
      setToggleTarget(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Murid"
        description="Tambah, edit, dan kelola status murid."
      >
        <Button onClick={openCreateDialog}>
          <Plus />
          Tambah Murid
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Orang Tua</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada murid.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.parentName ?? "-"}</TableCell>
                      <TableCell>{student.contact ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.instrument}</Badge>
                      </TableCell>
                      <TableCell>{student.level ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === "ACTIVE" ? "default" : "outline"}>
                          {student.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
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
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/students/${student.id}/timeline`}>Riwayat</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditDialog(student)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setToggleTarget(student)}>
                              {student.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
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

      <StudentForm open={formOpen} onOpenChange={setFormOpen} student={editingStudent} />

      <AlertDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.status === "ACTIVE" ? "Nonaktifkan murid?" : "Aktifkan murid?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.status === "ACTIVE"
                ? `${toggleTarget?.name} tidak akan muncul di jadwal baru.`
                : `${toggleTarget?.name} akan aktif kembali.`}
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
