import { NextRequest, NextResponse } from 'next/server';
import { organizePOFiles, uploadFileToFolder } from '@/lib/google-drive';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, context: any) {
  const { params } = context;
  const customId = params.requestId;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const uploadedBy = formData.get('uploadedBy') as string | null;
  const poNumber = formData.get('poNumber') as string | null;
  if (!file || !uploadedBy || !poNumber) {
    return NextResponse.json({ error: 'Arquivo, usuário ou número da PO ausente.' }, { status: 400 });
  }
  // Buscar a requisição para pegar a pasta principal
  const [request] = await db.select().from(requests).where(eq(requests.customId, customId));
  if (!request || !request.driveFolderId) {
    return NextResponse.json({ error: 'Requisição não encontrada ou sem pasta.' }, { status: 404 });
  }
  // Criar/obter subpasta da PO
  const poFolderId = await organizePOFiles(request.driveFolderId, poNumber, []);
  // Upload do arquivo
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const driveFile = await uploadFileToFolder(
    buffer,
    file.name,
    file.type,
    poFolderId
  );
  return NextResponse.json({
    success: true,
    file: {
      id: driveFile.id,
      name: driveFile.name,
      webViewLink: driveFile.webViewLink,
    },
  });
} 