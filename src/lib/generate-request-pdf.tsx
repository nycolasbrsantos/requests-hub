import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Buffer } from 'buffer';

// Estilos básicos para o PDF
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12, fontFamily: 'Helvetica' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  section: { marginBottom: 12 },
  label: { fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#333' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#333' },
  tableCell: { flex: 1, padding: 4 },
  footer: { marginTop: 24, fontSize: 10, textAlign: 'center', color: '#888' },
});

// Função utilitária para gerar o PDF
export async function generateRequestPdf(request: {
  customId: string;
  createdAt: string;
  requesterName: string;
  status: string;
  productName?: string;
  quantity?: number;
  unitPrice?: string;
  supplier?: string;
  priority?: string;
  description?: string;
  statusHistory?: {
    status: string;
    changedAt: string;
    changedBy: string;
    comment?: string;
  }[];
  attachments?: { id: string; name: string; webViewLink?: string }[];
}) {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Requisição de Compras</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Nº:</Text>
            <Text>{request.customId}</Text>
            <Text style={styles.label}>Data:</Text>
            <Text>{new Date(request.createdAt).toLocaleString('pt-BR')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Solicitante:</Text>
            <Text>{request.requesterName}</Text>
            <Text style={styles.label}>Status:</Text>
            <Text>{request.status}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Produto:</Text> <Text>{request.productName || '-'}</Text>
          <Text style={styles.label}>Quantidade:</Text> <Text>{request.quantity || '-'}</Text>
          <Text style={styles.label}>Preço Unitário:</Text> <Text>{request.unitPrice || '-'}</Text>
          <Text style={styles.label}>Fornecedor:</Text> <Text>{request.supplier || '-'}</Text>
          <Text style={styles.label}>Prioridade:</Text> <Text>{request.priority || '-'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Descrição:</Text>
          <Text>{request.description || '-'}</Text>
        </View>
        {/* Lista de anexos */}
        {request.attachments && request.attachments.length > 0 && (
          <View style={[styles.section, { marginTop: 8 }]}> 
            <Text style={[styles.label, { marginBottom: 4 }]}>Anexos</Text>
            {request.attachments.map((att, idx) => (
              <Text key={att.id || idx} style={{ fontSize: 11, marginBottom: 2 }}>
                • {att.name} {att.webViewLink ? `(link: ${att.webViewLink})` : ''}
              </Text>
            ))}
          </View>
        )}
        {/* Linha do tempo e comentários */}
        {request.statusHistory && request.statusHistory.length > 0 && (
          <View style={[styles.section, { marginTop: 16 }]}> 
            <Text style={[styles.label, { marginBottom: 6 }]}>Linha do Tempo e Comentários</Text>
            {request.statusHistory.map((h, idx) => (
              <View key={idx} style={{ marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderColor: '#ccc' }}>
                <Text>
                  <Text style={styles.label}>Status:</Text> {h.status}  <Text style={styles.label}>em</Text> {new Date(h.changedAt).toLocaleString('pt-BR')}
                </Text>
                <Text>
                  <Text style={styles.label}>Por:</Text> {h.changedBy}
                </Text>
                {h.comment && (
                  <Text><Text style={styles.label}>Comentário:</Text> {h.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.footer}>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
      </Page>
    </Document>
  );
  const pdfInstance = pdf(doc);
  // @ts-expect-error: Garantir ambiente Node.js
  const buffer: Buffer = await pdfInstance.toBuffer();
  return buffer;
} 