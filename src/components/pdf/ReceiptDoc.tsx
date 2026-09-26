import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { PaymentMethodPdfIcon } from '@/components/payments/payment-method-pdf';
import { formatKwacha } from '@/lib/money';

const BRAND = '#00A6E0';
const DARK = '#061633';
const MUTED = '#6B7F9E';
const RULE = '#DCE4F0';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#111111', paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 12 },
  logo: { width: 130 },
  headerText: { marginLeft: 14 },
  business: { fontSize: 14, fontWeight: 'bold', color: DARK },
  address: { fontSize: 8, color: MUTED, marginTop: 3 },
  heading: { fontSize: 16, fontWeight: 'bold', color: DARK, textAlign: 'center', marginTop: 22, letterSpacing: 1 },
  receiptNo: { fontSize: 26, fontWeight: 'bold', color: BRAND, textAlign: 'center', marginTop: 8 },
  receiptLabel: { fontSize: 8, color: MUTED, textAlign: 'center', marginTop: 2, letterSpacing: 1 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  dateCell: { fontSize: 9, color: '#333333' },
  rule: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 12 },
  sectionTitle: { fontSize: 8, color: MUTED, letterSpacing: 1, marginBottom: 6 },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodText: { fontSize: 11, fontWeight: 'bold', color: DARK, marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  col: { width: '50%', marginBottom: 10 },
  label: { fontSize: 7.5, color: MUTED, letterSpacing: 0.6, marginBottom: 3 },
  value: { fontSize: 10, color: '#111111' },
  amountBox: {
    backgroundColor: DARK,
    borderRadius: 6,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  amountLabel: { fontSize: 8, color: '#9FB3D1', letterSpacing: 1 },
  amountValue: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 34,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 10,
  },
  footerLine: { fontSize: 8, color: '#333333', marginBottom: 3 },
  voidLine: { fontSize: 8, fontWeight: 'bold', color: '#B42318', marginTop: 6, textAlign: 'center', letterSpacing: 0.5 },
  contactLine: { fontSize: 7.5, color: MUTED, marginTop: 6, textAlign: 'center' },
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  airtel_money: 'Airtel Money',
  mtn_mobile_money: 'MTN Mobile Money',
  other: 'Other',
};

function methodLabel(raw: string): string {
  return METHOD_LABELS[raw] ?? String(raw ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface ReceiptData {
  receiptNo: string;
  paidAt: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  customerName: string;
  nrc: string | null;
  loanNumber: string;
  outstandingBalance: number;
  nextDueDate: string | null;
  amountDueToDate: number;
  arrears: number;
  recordedByName: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  logoDataUri: string | null;
}

export interface ReceiptDocProps extends ReceiptData {
  generatedAt: string;
}

/** Render the receipt PDF to a Buffer (API route only — not client code). */
export async function renderReceiptPdf(props: ReceiptDocProps): Promise<Buffer> {
  return renderToBuffer(<ReceiptDoc {...props} />);
}

export function ReceiptDoc(props: ReceiptDocProps) {
  const {
    receiptNo, paidAt, amount, method, reference, status,
    customerName, nrc, loanNumber, outstandingBalance,
    nextDueDate, amountDueToDate, arrears,
    recordedByName, businessName, businessPhone, businessEmail,
    logoDataUri, generatedAt,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {logoDataUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoDataUri} style={styles.logo} />
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.business}>{businessName}</Text>
            <Text style={styles.address}>{businessPhone} • {businessEmail}</Text>
          </View>
        </View>

        <Text style={styles.heading}>OFFICIAL RECEIPT</Text>
        <Text style={styles.receiptNo}>{receiptNo}</Text>
        <Text style={styles.receiptLabel}>RECEIPT NUMBER</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateCell}>Date received: {fmtDate(paidAt)}</Text>
          <Text style={styles.dateCell}>Status: {status.toUpperCase()}</Text>
        </View>
        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
        <View style={styles.methodRow}>
          <PaymentMethodPdfIcon method={method} size={18} />
          <Text style={styles.methodText}>{methodLabel(method)}</Text>
        </View>

        <View style={styles.rule} />

        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.label}>CUSTOMER</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>NRC</Text>
            <Text style={styles.value}>{nrc || '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>LOAN NUMBER</Text>
            <Text style={styles.value}>{loanNumber}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>REFERENCE</Text>
            <Text style={styles.value}>{reference || '—'}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>AMOUNT RECEIVED</Text>
          <Text style={styles.amountValue}>{formatKwacha(amount)}</Text>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT POSITION AFTER THIS PAYMENT</Text>
        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.label}>NEW OUTSTANDING BALANCE</Text>
            <Text style={styles.value}>{formatKwacha(outstandingBalance)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>NEXT DUE DATE</Text>
            <Text style={styles.value}>{nextDueDate ? fmtDate(nextDueDate) : '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>AMOUNT DUE TO DATE</Text>
            <Text style={styles.value}>{formatKwacha(amountDueToDate)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>ARREARS</Text>
            <Text style={styles.value}>{formatKwacha(arrears)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLine}>Received by: {recordedByName}</Text>
          <Text style={styles.footerLine}>Issued: {fmtDateTime(generatedAt)}</Text>
          <Text style={styles.voidLine}>DO NOT ALTER. ANY ERASURE VOIDS THIS RECEIPT.</Text>
          <Text style={styles.contactLine}>{businessName} • {businessPhone} • {businessEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
