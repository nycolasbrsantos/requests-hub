import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { requests, Request } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: { requestId: string } }) {
  const id = Number(params.requestId);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const result = await db.select().from(requests).where(eq(requests.id, id));
  const request: Request | undefined = result[0];

  if (!request) return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });

  return NextResponse.json(request);
} 