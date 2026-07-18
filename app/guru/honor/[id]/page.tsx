import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getGuruPaymentProofs } from "@/lib/queries/honor";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ProofGallery } from "@/components/honor/proof-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GuruHonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // getGuruPaymentProofs scopes to the signed-in guru's own payments; returns
  // null (-> 404) for a payment that isn't theirs.
  const payment = await getGuruPaymentProofs(id);
  if (!payment) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Pembayaran"
        description={`Dibayar ${payment.paidAtStr} · ${formatRupiah(payment.amount)}`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/guru/honor">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Bukti Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <ProofGallery proofs={payment.proofs} />
        </CardContent>
      </Card>
    </div>
  );
}
