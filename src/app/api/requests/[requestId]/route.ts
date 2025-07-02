import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  requests,
  Request,
  purchaseRequests,
  maintenanceRequests,
  itSupportRequests,
  files
} from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const { requestId: customId } = await context.params;

  let request: Request | undefined = undefined;
  let id: number | undefined = undefined;

  // Buscar apenas por customId
  if (customId) {
    const result = await db.select().from(requests).where(eq(requests.customId, customId));
    request = result[0];
    if (request) id = request.id;
  }

  if (!request || !id) {
    return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
  }

  let extra = {};
  if (request.type === 'purchase') {
    const [purchase] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.requestId, id));
    if (purchase) extra = purchase;
  } else if (request.type === 'maintenance') {
    const [maintenance] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.requestId, id));
    if (maintenance) extra = maintenance;
  } else if (["it_support", "it_ticket"].includes(request.type as string)) {
    const [itSupport] = await db.select().from(itSupportRequests).where(eq(itSupportRequests.requestId, id));
    if (itSupport) extra = itSupport;
  }

  // Anexos da tabela files
  const fileRows = await db.select().from(files).where(eq(files.requestId, id));
  const fileAttachments = fileRows.map(f => ({
    id: f.id.toString(),
    name: f.originalName,
    webViewLink: f.driveFileId ? `https://drive.google.com/file/d/${f.driveFileId}/view` : undefined,
  }));

  // Anexos do campo JSON (garantir array seguro)
  const jsonAttachments = Array.isArray(request.attachments) ? request.attachments.map(a => ({
    id: a.id,
    name: a.name,
    webViewLink: a.webViewLink,
  })) : [];

  // Unificar anexos sem duplicidade (priorizar files)
  const allAttachments = [
    ...fileAttachments,
    ...jsonAttachments.filter(a => !fileAttachments.some(fa => fa.id === a.id)),
  ];

  return NextResponse.json({ ...request, ...extra, attachments: allAttachments });
}
