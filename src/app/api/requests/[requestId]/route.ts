/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { requests, Request, purchaseRequests, maintenanceRequests, itSupportRequests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, context: any) {
  const { params } = await context;
  const id = Number(params.requestId);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const result = await db.select().from(requests).where(eq(requests.id, id));
  const request: Request | undefined = result[0];

  if (!request) return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });

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

  return NextResponse.json({ ...request, ...extra });
}