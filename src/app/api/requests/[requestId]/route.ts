import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  requests,
  purchaseRequests,
  maintenanceRequests,
  itSupportRequests,
  files
} from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const { requestId: customId } = await context.params;

  // Buscar a requisição principal por customId
  const [request] = await db.select().from(requests).where(eq(requests.customId, customId));
  if (!request) return new Response('Not found', { status: 404 });

  let extra = {};
  if (request.type === 'purchase') {
    const [purchase] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.requestId, request.id));
    if (purchase) extra = purchase;
  } else if (request.type === 'maintenance') {
    const [maintenance] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.requestId, request.id));
    if (maintenance) extra = maintenance;
  } else if (["it_support", "it_ticket"].includes(request.type as string)) {
    const [itSupport] = await db.select().from(itSupportRequests).where(eq(itSupportRequests.requestId, request.id));
    if (itSupport) extra = itSupport;
  }

  // Anexos da tabela files
  const fileRows = await db.select().from(files).where(eq(files.requestId, request.id));
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
