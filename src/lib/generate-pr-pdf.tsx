import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12, fontFamily: 'Helvetica', position: 'relative' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#0674ad' },
  institution: { fontSize: 12, textAlign: 'center', marginBottom: 8, color: '#0674ad' },
  logo: { width: '100%', height: 60, objectFit: 'cover', marginBottom: 8 },
  section: { marginBottom: 12 },
  label: { fontWeight: 'bold', color: '#0674ad' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#0674ad' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e6f7fa', borderBottomWidth: 1, borderColor: '#0674ad' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e6f7fa' },
  tableCell: { flex: 1, padding: 4, fontSize: 11 },
  tableCellHeader: { flex: 1, padding: 4, fontSize: 11, fontWeight: 'bold', color: '#0674ad' },
  statusPending: { fontWeight: 'bold', color: '#0674ad', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  statusApproved: { fontWeight: 'bold', color: '#33cd33', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  statusRejected: { fontWeight: 'bold', color: '#ff6b35', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  prNumber: { fontSize: 18, fontWeight: 'bold', color: '#0674ad', textAlign: 'center', marginBottom: 12 },
  timelineBlock: { marginBottom: 10, padding: 8, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#33cd33' },
  timelineStatus: { fontWeight: 'bold', color: '#0674ad' },
  timelineDate: { color: '#64748b', fontSize: 10 },
  timelineComment: { fontStyle: 'italic', color: '#334155', marginTop: 2, fontSize: 11 },
  footer: { marginTop: 24, fontSize: 10, textAlign: 'center', color: '#888' },
  totalSection: { marginTop: 16, padding: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#0674ad' },
});

export async function generatePRPdf(request: {
  customId: string;
  createdAt: string;
  requesterName: string;
  status: string;
  productName?: string;
  quantity?: number;
  unitPriceInCents?: string;
  supplier?: string;
  priority?: string;
  description?: string;
  needApprovedBy?: string;
  statusHistory?: {
    status: string;
    changedAt: string;
    changedBy: string;
    comment?: string;
  }[];
  attachments?: { id: string; name: string; webViewLink?: string }[];
}) {
  const cabecalhoPath = path.join(process.cwd(), 'public/branding/cabecalho.png');
  const rodapePath = path.join(process.cwd(), 'public/branding/rodape.png');
  const cabecalhoBuffer = fs.readFileSync(cabecalhoPath);
  const rodapeBuffer = fs.readFileSync(rodapePath);

  const quantity = request.quantity || 0;
  const unitPriceInCents = request.unitPriceInCents ? parseInt(request.unitPriceInCents) : 0;
  const totalInCents = quantity * unitPriceInCents;
  const totalFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(totalInCents / 100);

  const unitPriceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unitPriceInCents / 100);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={cabecalhoBuffer} style={styles.logo} />
        <View style={{ position: 'relative', zIndex: 1 }}>
          <Text style={styles.institution}>Solicitações - RequestsHub</Text>
          <Text style={styles.header}>Requisição de Compras</Text>
          <Text style={styles.statusPending}>Status: {request.status}</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text>
                <Text style={styles.label}>PR Nº:</Text>{' '}{request.customId}{' '}
                <Text style={styles.label}>Data:</Text>{' '}{new Date(request.createdAt).toLocaleString('pt-BR')}{' '}
              </Text>
            </View>
            <View style={styles.row}>
              <Text>
                <Text style={styles.label}>Solicitante:</Text>{' '}{request.requesterName}{' '}
                <Text style={styles.label}>Fornecedor:</Text>{' '}{request.supplier || '-'}{' '}
              </Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Detalhes do Produto</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellHeader}>Produto</Text>
                <Text style={styles.tableCellHeader}>Quantidade</Text>
                <Text style={styles.tableCellHeader}>Preço Unit.</Text>
                <Text style={styles.tableCellHeader}>Total</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>{request.productName || '-'}</Text>
                <Text style={styles.tableCell}>{request.quantity || '-'}</Text>
                <Text style={styles.tableCell}>{unitPriceFormatted}</Text>
                <Text style={styles.tableCell}>{totalFormatted}</Text>
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <Text>
              <Text style={styles.label}>Descrição:</Text>{' '}{request.description || '-'}{' '}
            </Text>
            <Text>
              <Text style={styles.label}>Prioridade:</Text>{' '}{request.priority || '-'}{' '}
            </Text>
          </View>
          {/* Aprovação de necessidade, se houver */}
          {request.needApprovedBy && (
            <View style={styles.section}>
              <Text style={[styles.label, { marginBottom: 4 }]}>Aprovação de Necessidade</Text>
              <Text>✓ Necessidade aprovada por: {request.needApprovedBy}</Text>
            </View>
          )}
          {/* Lista de anexos */}
          {request.attachments && request.attachments.length > 0 && (
            <View style={[styles.section, { marginTop: 8 }]}> 
              <Text style={[styles.label, { marginBottom: 4 }]}>Anexos</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellHeader}>Nome</Text>
                  <Text style={styles.tableCellHeader}>Link</Text>
                </View>
                {request.attachments.map((att, idx) => (
                  <View key={att.id || idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{att.name}</Text>
                    <Text style={styles.tableCell}>{att.webViewLink ? att.webViewLink : '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* Linha do tempo */}
          {request.statusHistory && request.statusHistory.length > 0 && (
            <View style={[styles.section, { marginTop: 16 }]}> 
              <Text style={[styles.label, { marginBottom: 6 }]}>Histórico de Aprovações</Text>
              {request.statusHistory.map((h, idx) => (
                <View key={idx} style={styles.timelineBlock}>
                  <Text style={styles.timelineStatus}>{h.status}</Text>
                  <Text style={styles.timelineDate}>{new Date(h.changedAt).toLocaleString('pt-BR')}</Text>
                  <Text>
                    <Text style={styles.label}>Por:</Text>{' '}{h.changedBy}
                  </Text>
                  {h.comment && (
                    <Text style={styles.timelineComment}>{h.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          <Text style={styles.footer}>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
        </View>
        <Image src={rodapeBuffer} style={{ width: 420, height: 60, objectFit: 'cover', position: 'absolute', right: 0, bottom: 0 }} />
      </Page>
    </Document>
  );
  const pdfInstance = pdf(doc);
  // @ts-expect-error: Garantir ambiente Node.js
  const buffer: Buffer = await pdfInstance.toBuffer();
  return buffer;
} 