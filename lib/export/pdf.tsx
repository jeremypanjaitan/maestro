import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatDbDate } from "@/lib/domain/dbDate";
import { CLASS_TYPE_LABELS, PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";

import { REPORT_TITLES } from "./types";
import type { PayrollExportData, ReportExportMeta, ReportRow, ReportType } from "./types";

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
  cellNo: { width: "6%", padding: 6 },
  cellDate: { width: "14%", padding: 6 },
  cellStudent: { width: "24%", padding: 6 },
  cellTime: { width: "10%", padding: 6 },
  cellType: { width: "12%", padding: 6 },
  cellMeeting: { width: "18%", padding: 6 },
  cellRate: { width: "16%", padding: 6, textAlign: "right" },
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
            <Text style={styles.cellType}>Tipe</Text>
            <Text style={styles.cellMeeting}>Pertemuan ke-N</Text>
            <Text style={styles.cellRate}>Rate</Text>
          </View>

          {payroll.items.map((item, index) => (
            <View style={styles.row} key={`${item.date.toISOString()}-${index}`}>
              <Text style={styles.cellNo}>{index + 1}</Text>
              <Text style={styles.cellDate}>{formatDbDate(item.date)}</Text>
              <Text style={styles.cellStudent}>{item.studentName}</Text>
              <Text style={styles.cellTime}>{item.startTime}</Text>
              <Text style={styles.cellType}>{CLASS_TYPE_LABELS[item.classType]}</Text>
              <Text style={styles.cellMeeting}>
                {item.meetingNumber != null ? `Ke-${item.meetingNumber}` : "-"}
              </Text>
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

const reportStyles = StyleSheet.create({
  headerCell: { padding: 6, fontWeight: 700 },
  cell: { padding: 6 },
  summary: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: 700,
  },
});

type ReportDocumentProps = {
  type: ReportType;
  data: ReportRow[];
  meta: ReportExportMeta;
};

/** Generic recap document (Task 22 "Laporan"): title + subtitle, a table
 * built from `meta.columns`/`data`, and optional summary lines. Kept
 * generic over the 4 recap shapes — the caller supplies columns + rows. */
export function ReportDocument({ type, data, meta }: ReportDocumentProps) {
  const title = meta.title ?? REPORT_TITLES[type];
  const columnWidth = `${100 / meta.columns.length}%`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {meta.subtitle ? <Text style={styles.meta}>{meta.subtitle}</Text> : null}

        <View style={styles.table}>
          <View style={styles.headerRow}>
            {meta.columns.map((column) => (
              <Text key={column.key} style={[reportStyles.headerCell, { width: columnWidth }]}>
                {column.header}
              </Text>
            ))}
          </View>

          {data.map((row, index) => (
            <View style={styles.row} key={index}>
              {meta.columns.map((column) => (
                <Text key={column.key} style={[reportStyles.cell, { width: columnWidth }]}>
                  {String(row[column.key] ?? "")}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {meta.summary?.map((item) => (
          <Text key={item.label} style={reportStyles.summary}>
            {item.label}: {item.value}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

/**
 * Renders a generic recap PDF document to a Buffer. Node-only
 * (@react-pdf/renderer) — only ever import this from a route handler or
 * another server-only module.
 */
export async function renderReportPdf(
  type: ReportType,
  data: ReportRow[],
  meta: ReportExportMeta,
): Promise<Buffer> {
  return renderToBuffer(<ReportDocument type={type} data={data} meta={meta} />);
}
