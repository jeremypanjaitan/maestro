import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatDbDate } from "@/lib/domain/dbDate";
import { PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";

import type { PayrollExportData } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  meta: {
    fontSize: 11,
    marginBottom: 2,
  },
  table: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    fontWeight: 700,
  },
  cellNo: { width: "8%", padding: 6 },
  cellDate: { width: "20%", padding: 6 },
  cellStudent: { width: "37%", padding: 6 },
  cellTime: { width: "15%", padding: 6 },
  cellRate: { width: "20%", padding: 6, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    fontWeight: 700,
  },
  totalLabel: { width: "80%", padding: 6, textAlign: "right" },
  totalValue: { width: "20%", padding: 6, textAlign: "right" },
});

type PayrollDocumentProps = {
  payroll: PayrollExportData;
};

export function PayrollDocument({ payroll }: PayrollDocumentProps) {
  const period = formatPeriod(payroll.periodMonth, payroll.periodYear);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Payroll — {payroll.teacherName}</Text>
        <Text style={styles.meta}>Periode: {period}</Text>
        <Text style={styles.meta}>Status: {PAYROLL_STATUS_LABELS[payroll.status]}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cellNo}>No</Text>
            <Text style={styles.cellDate}>Tanggal</Text>
            <Text style={styles.cellStudent}>Murid</Text>
            <Text style={styles.cellTime}>Jam</Text>
            <Text style={styles.cellRate}>Rate</Text>
          </View>

          {payroll.items.map((item, index) => (
            <View style={styles.row} key={`${item.date.toISOString()}-${index}`}>
              <Text style={styles.cellNo}>{index + 1}</Text>
              <Text style={styles.cellDate}>{formatDbDate(item.date)}</Text>
              <Text style={styles.cellStudent}>{item.studentName}</Text>
              <Text style={styles.cellTime}>{item.startTime}</Text>
              <Text style={styles.cellRate}>{formatRupiah(item.rate)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(payroll.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renders the payroll PDF document to a Buffer. Node-only
 * (@react-pdf/renderer) — only ever import this from a route handler or
 * another server-only module.
 */
export async function renderPayrollPdf(payroll: PayrollExportData): Promise<Buffer> {
  return renderToBuffer(<PayrollDocument payroll={payroll} />);
}
