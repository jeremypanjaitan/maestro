import { auth } from "@/lib/auth";
import { renderKwitansiPdf } from "@/lib/export/kwitansi";
import { getStudentPayment } from "@/lib/queries/student-payment";

// @react-pdf/renderer and fs are Node-only; this route must run on the Node
// runtime (not Edge) and must not be statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/** Strips characters that are unsafe in a Content-Disposition filename. */
function toFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const payment = await getStudentPayment(id);

  if (!payment) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await renderKwitansiPdf(payment);
  const filename = `kwitansi-${toFilenameSegment(payment.studentName)}-${toFilenameSegment(payment.number)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
