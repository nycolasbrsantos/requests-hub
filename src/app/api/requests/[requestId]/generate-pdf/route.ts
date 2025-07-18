import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateRequestPdf } from '@/lib/generate-request-pdf';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const params = await context.params;
  const customId = params.requestId;
  const [request] = await db.select().from(requests).where(eq(requests.customId, customId));
  if (!request) {
    return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
  }
  const pdfBuffer = await generateRequestPdf({
    customId: request.customId ?? '',
    createdAt: request.createdAt?.toISOString?.() ?? (typeof request.createdAt === 'string' ? request.createdAt : ''),
    requesterName: request.requesterName ?? '',
    status: request.status ?? '',
    productName: request.productName ?? undefined,
    quantity: request.quantity ?? undefined,
    unitPriceInCents: request.unitPriceInCents ? String(request.unitPriceInCents) : undefined,
    supplier: request.supplier ?? undefined,
    priority: request.priority ?? undefined,
    description: request.description ?? undefined,
    statusHistory: Array.isArray(request.statusHistory) ? request.statusHistory : [],
    attachments: Array.isArray(request.attachments) ? request.attachments : [],
  });
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Requisicao-${request.customId || request.id}.pdf`,
    },
  });
} 