import { readFileSync } from "node:fs";
import path from "node:path";

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { terbilangRupiah } from "@/lib/domain/terbilang";
import type { StudentPaymentDetail, StudentPaymentDetailItem } from "@/lib/queries/student-payment";
import { MONTH_NAMES_ID, formatRupiah } from "@/lib/utils";

// Logo + signature live outside `public/` on purpose: the signature must not
// be reachable by URL. They are read from disk at render time (Node only);
// `next.config.ts` traces them into the kwitansi route's bundle.
const ASSET_DIR = path.join(process.cwd(), "assets", "kwitansi");

const SCHOOL_NAME = "Rumah Musik";
const SCHOOL_TAGLINE = "Kursus & Les Musik";
const CITY = "Jakarta";
const SIGNER_NAME = "Jeremy Panjaitan";
const SIGNER_ROLE = "Pengajar";

const NAVY = "#1b3a5c";
const MUTED = "#64748b";
const SOFT = "#f1f5f9";
const LINE = "#e2e8f0";
const GREEN = "#1e8e4e";

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "2026-09-28" -> "28 September 2026". */
function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_NAMES_ID[m - 1]} ${y}`;
}

/** "2026-09-28" -> "Senin, 28 September 2026". */
function formatDayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = DAY_NAMES_ID[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${day}, ${formatLongDate(dateStr)}`;
}

/** Second line of a row: time, teacher, and why it's special (if it is). */
function itemSubtitle(it: StudentPaymentDetailItem): string {
  const parts = [`${it.startTime} · ${it.durationMinutes} menit`, `Guru: ${it.teacherName}`];
  if (it.status === "SCHEDULED") parts.push("dijadwalkan");
  if (it.status === "CANCEL") parts.push("dibatalkan — dialihkan ke pertemuan lain");
  if (it.rescheduledFromDateStr) {
    parts.push(`pengganti ${formatLongDate(it.rescheduledFromDateStr)}`);
  }
  return parts.join(" · ");
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: NAVY,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 58, height: 58, marginRight: 14 },
  schoolName: { fontSize: 19, fontFamily: "Helvetica-Bold", color: NAVY },
  tagline: { fontSize: 9.5, color: MUTED, marginTop: 3 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 3, marginBottom: 4 },
  titleMeta: { fontSize: 9.5, color: MUTED, marginTop: 2 },

  cards: { flexDirection: "row", marginTop: 18 },
  card: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 11 },
  cardGap: { width: 10 },
  cardLabel: { fontSize: 8, color: MUTED, letterSpacing: 1.2, marginBottom: 5 },
  cardValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  cardSub: { fontSize: 9.5, color: MUTED, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  badge: {
    backgroundColor: GREEN,
    color: "#ffffff",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 2,
    marginLeft: 4,
  },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 6,
  },
  thead: { flexDirection: "row", backgroundColor: NAVY, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  th: { paddingVertical: 7, paddingHorizontal: 8, fontSize: 9 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  colNo: { width: 34, paddingVertical: 7, paddingHorizontal: 8, color: MUTED },
  colItem: { flex: 1, paddingVertical: 7, paddingHorizontal: 8 },
  colAmount: { width: 110, paddingVertical: 7, paddingHorizontal: 8, textAlign: "right" },
  itemTitle: { fontSize: 10 },
  itemSub: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  mergedAmount: {
    width: 150,
    borderLeftWidth: 1,
    borderLeftColor: LINE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    justifyContent: "center",
    alignItems: "center",
  },
  mergedValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  mergedNote: { fontSize: 8.5, color: MUTED, marginTop: 2 },

  totalWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  totalLabel: { color: "#ffffff", fontSize: 9, letterSpacing: 1.2, marginRight: 16 },
  totalValue: { color: "#ffffff", fontSize: 15, fontFamily: "Helvetica-Bold" },
  terbilang: {
    marginTop: 12,
    backgroundColor: SOFT,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontFamily: "Helvetica-Oblique",
    fontSize: 9.5,
  },

  closing: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26 },
  receivedText: { width: "52%", fontSize: 9.5, lineHeight: 1.6 },
  bold: { fontFamily: "Helvetica-Bold" },
  signBlock: { width: "36%", alignItems: "center" },
  signMeta: { fontSize: 9, color: MUTED, textAlign: "center" },
  signature: { height: 84, marginTop: 2, marginBottom: -18 },
  signLine: { alignSelf: "stretch", borderTopWidth: 1, borderTopColor: "#111827", marginTop: 2 },
  signName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 3 },
  signRole: { fontSize: 9, color: MUTED },
  note: { marginTop: 18, fontSize: 9, color: MUTED },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
    textAlign: "center",
    fontSize: 8.5,
    color: MUTED,
  },
});

type KwitansiDocumentProps = {
  payment: StudentPaymentDetail;
  logo: Buffer;
  signature: Buffer;
};

/**
 * Kwitansi for one student payment, modelled on the Rumah Musik service
 * receipt: header with logo, murid/kelas cards, "Rincian Pertemuan" table,
 * total + terbilang, and the signed "Diterima oleh" block.
 *
 * When the per-session rates add up to the paid amount, each row shows its
 * own amount; otherwise (amount edited, or rates unset) the amount column is
 * one merged cell with the total, like the "paket" layout of the original.
 */
function KwitansiDocument({ payment, logo, signature }: KwitansiDocumentProps) {
  const rateSum = payment.items.reduce((sum, it) => sum + it.rateSnapshot, 0);
  const perRow = rateSum === payment.amount && payment.items.every((it) => it.rateSnapshot > 0);
  const teachers = Array.from(new Set(payment.items.map((it) => it.teacherName)));
  const paidAtLong = formatLongDate(payment.paidAtStr);
  const total = formatRupiah(payment.amount);

  return (
    <Document title={`Kwitansi ${payment.number}`} author={SCHOOL_NAME}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={logo} style={styles.logo} />
            <View>
              <Text style={styles.schoolName}>{SCHOOL_NAME}</Text>
              <Text style={styles.tagline}>{SCHOOL_TAGLINE}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>KWITANSI</Text>
            <Text style={styles.titleMeta}>No. {payment.number}</Text>
            <Text style={styles.titleMeta}>Tanggal: {paidAtLong}</Text>
          </View>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MURID</Text>
            <Text style={styles.cardValue}>{payment.studentName}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.cardSub}>Status pembayaran:</Text>
              <Text style={styles.badge}>LUNAS</Text>
            </View>
          </View>
          <View style={styles.cardGap} />
          <View style={styles.card}>
            <Text style={styles.cardLabel}>KELAS</Text>
            <Text style={styles.cardValue}>{payment.studentInstrument}</Text>
            <Text style={styles.cardSub}>
              {payment.items.length} pertemuan · Guru: {teachers.join(", ")}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>RINCIAN PERTEMUAN</Text>
        <View style={styles.thead}>
          <Text style={[styles.th, { width: 34 }]}>No</Text>
          <Text style={[styles.th, { flex: 1 }]}>Pertemuan</Text>
          <Text style={[styles.th, { width: perRow ? 110 : 150, textAlign: "right" }]}>
            Jumlah
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            {payment.items.map((it, i) => (
              <View key={it.sessionId} style={styles.row} wrap={false}>
                <Text style={styles.colNo}>{i + 1}</Text>
                <View style={styles.colItem}>
                  <Text style={styles.itemTitle}>
                    {it.meetingNumber ? `Pertemuan ke-${it.meetingNumber} · ` : ""}
                    {formatDayDate(it.dateStr)}
                  </Text>
                  <Text style={styles.itemSub}>{itemSubtitle(it)}</Text>
                </View>
                {perRow && <Text style={styles.colAmount}>{formatRupiah(it.rateSnapshot)}</Text>}
              </View>
            ))}
          </View>
          {!perRow && (
            <View style={styles.mergedAmount}>
              <Text style={styles.mergedValue}>{total}</Text>
              <Text style={styles.mergedNote}>({payment.items.length} pertemuan)</Text>
            </View>
          )}
        </View>

        <View style={styles.totalWrap} wrap={false}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL DIBAYAR</Text>
            <Text style={styles.totalValue}>{total}</Text>
          </View>
        </View>
        <Text style={styles.terbilang}>Terbilang: {terbilangRupiah(payment.amount)}</Text>

        <View style={styles.closing} wrap={false}>
          <Text style={styles.receivedText}>
            Uang sejumlah <Text style={styles.bold}>{total}</Text> telah diterima dengan baik
            sebagai pembayaran lunas atas les musik untuk pertemuan di atas.
          </Text>
          <View style={styles.signBlock}>
            <Text style={styles.signMeta}>
              {CITY}, {paidAtLong}
            </Text>
            <Text style={styles.signMeta}>Diterima oleh,</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={signature} style={styles.signature} />
            <View style={styles.signLine} />
            <Text style={styles.signName}>{SIGNER_NAME}</Text>
            <Text style={styles.signRole}>{SIGNER_ROLE}</Text>
          </View>
        </View>

        {payment.note && <Text style={styles.note}>Catatan: {payment.note}</Text>}

        <Text style={styles.footer} fixed>
          Terima kasih telah mempercayakan pendidikan musik Anda kepada {SCHOOL_NAME}.
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Renders the kwitansi PDF to a Buffer. Node-only (@react-pdf/renderer, fs)
 * — only ever import this from a route handler or another server-only module.
 */
export async function renderKwitansiPdf(payment: StudentPaymentDetail): Promise<Buffer> {
  const logo = readFileSync(path.join(ASSET_DIR, "logo.png"));
  const signature = readFileSync(path.join(ASSET_DIR, "signature.png"));
  return renderToBuffer(<KwitansiDocument payment={payment} logo={logo} signature={signature} />);
}
