import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

// Estilos básicos para o PDF
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12, fontFamily: 'Helvetica', position: 'relative' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#0674ad' },
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
  statusFinal: { fontWeight: 'bold', color: '#33cd33', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  timelineBlock: { marginBottom: 10, padding: 8, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#33cd33' },
  timelineStatus: { fontWeight: 'bold', color: '#0674ad' },
  timelineDate: { color: '#64748b', fontSize: 10 },
  timelineComment: { fontStyle: 'italic', color: '#334155', marginTop: 2, fontSize: 11 },
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
  // Caminhos absolutos para as imagens
  const cabecalhoPath = path.join(process.cwd(), 'public/branding/cabecalho.png');
  const rodapePath = path.join(process.cwd(), 'public/branding/rodape.png');
  const cabecalhoBuffer = fs.readFileSync(cabecalhoPath);
  const rodapeBuffer = fs.readFileSync(rodapePath);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho visual institucional */}
        <Image src={cabecalhoBuffer} style={styles.logo} />
        <View style={{ position: 'relative', zIndex: 1 }}>
          {/* Conteúdo principal do PDF */}
          <Text style={styles.institution}>Solicitações - RequestsHub</Text>
          <Text style={styles.header}>Requisição de Compras</Text>
          <Text style={styles.statusFinal}>Status Atual: <Text>{request.status}</Text></Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Nº:</Text>
              <Text>{' '}{request.customId}{' '}</Text>
              <Text style={styles.label}>Data:</Text>
              <Text>{' '}{new Date(request.createdAt).toLocaleString('pt-BR')}{' '}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Solicitante:</Text>
              <Text>{' '}{request.requesterName}{' '}</Text>
              <Text style={styles.label}>Status:</Text>
              <Text>{' '}{request.status}{' '}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Produto:</Text> <Text>{' '}{request.productName || '-'}{' '}</Text>
            <Text style={styles.label}>Quantidade:</Text> <Text>{' '}{request.quantity || '-'}{' '}</Text>
            <Text style={styles.label}>Preço Unitário:</Text> <Text>{' '}{request.unitPrice || '-'}{' '}</Text>
            <Text style={styles.label}>Fornecedor:</Text> <Text>{' '}{request.supplier || '-'}{' '}</Text>
            <Text style={styles.label}>Prioridade:</Text> <Text>{' '}{request.priority || '-'}{' '}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Descrição:</Text>
            <Text>{' '}{request.description || '-'}{' '}</Text>
          </View>
          {/* Lista de anexos em tabela */}
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
          {/* Linha do tempo e comentários com agrupamento visual */}
          {request.statusHistory && request.statusHistory.length > 0 && (
            <View style={[styles.section, { marginTop: 16 }]}> 
              <Text style={[styles.label, { marginBottom: 6 }]}>Linha do Tempo e Comentários</Text>
              {request.statusHistory.map((h, idx) => (
                <View key={idx} style={styles.timelineBlock}>
                  <Text style={styles.timelineStatus}>{h.status}</Text>
                  <Text style={styles.timelineDate}>{new Date(h.changedAt).toLocaleString('pt-BR')}</Text>
                  <Text><Text style={styles.label}>Por:</Text>{' '}{h.changedBy}</Text>
                  {h.comment && (
                    <Text style={styles.timelineComment}>{h.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          <Text style={styles.footer}>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
        </View>
        {/* Rodapé visual institucional alinhado à direita */}
        <Image src={rodapeBuffer} style={{ width: 420, height: 60, objectFit: 'cover', position: 'absolute', right: 0, bottom: 0 }} />
      </Page>
    </Document>
  );
  const pdfInstance = pdf(doc);
  // @ts-expect-error: Garantir ambiente Node.js
  const buffer: Buffer = await pdfInstance.toBuffer();
  return buffer;
} 