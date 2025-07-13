import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const customId = searchParams.get('customId');
  if (!customId) return NextResponse.json({ error: 'customId obrigatório' }, { status: 400 });

  const reqs = await db.select().from(requests).where(eq(requests.customId, customId));
  if (!reqs[0]) return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });

  return NextResponse.json({ driveFolderId: reqs[0].driveFolderId });
}; 