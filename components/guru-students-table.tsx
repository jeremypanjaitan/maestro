import Link from "next/link";

import type { GuruStudent } from "@/lib/queries/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Read-only murid list for a guru, with a link into each student's progress
 * timeline. The guru-side counterpart of `StudentsTable`, deliberately
 * stripped of the admin actions (add / edit / activate-deactivate): a guru
 * may look at their students but never mutate the roster.
 *
 * Rows come from `getStudentsForGuru`, which already scopes to the signed-in
 * guru — this component does no filtering of its own.
 */
export function GuruStudentsTable({ students }: { students: GuruStudent[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Instrumen</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada murid yang terhubung dengan Anda.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{student.instrument}</Badge>
                    </TableCell>
                    <TableCell>{student.level ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/guru/students/${student.id}/timeline`}>Riwayat</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
