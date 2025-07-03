/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { files, File, requests } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFileToFolder } from '@/lib/google-drive';

export async function GET(req: NextRequest, context: any) {
  const { params } = await context;
  const requestId = params.requestId;
  try {
    // Buscar a requisição principal por customId
    const [request] = await db.select().from(requests).where(eq(requests.customId, requestId));
    if (!request) return new Response('Not found', { status: 404 });
    const reqIdNum = request.id;
    // Busca anexos no banco
    let attachments = [];
    try {
      attachments = await db.select().from(files).where(eq(files.requestId, reqIdNum));
    } catch (err) {
      console.error('Erro ao buscar anexos no banco:', err);
      return NextResponse.json({ attachments: [] });
    }
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json({ attachments: [] });
    }
    // Gera webViewLink padrão do Drive
    const result = attachments.map((att: File) => ({
      id: att.id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      webViewLink: att.filename ? `https://drive.google.com/file/d/${att.filename}/view` : '',
      uploadedBy: att.uploadedBy || '',
    }));
    return NextResponse.json({ attachments: result });
  } catch (error) {
    console.error('Erro detalhado na rota de anexos:', error);
    return NextResponse.json({ error: 'Erro ao buscar anexos.', details: String(error) }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: NextRequest, context: any) {
  const { params } = await context;
  const requestId = params.requestId;
  try {
    // Buscar a requisição principal por customId
    const [request] = await db.select().from(requests).where(eq(requests.customId, requestId));
    if (!request) return new Response('Not found', { status: 404 });
    const reqIdNum = request.id;
    // Buscar pasta do Google Drive associada à requisição
    const requestRow = await db.select().from(requests).where(eq(requests.id, reqIdNum));
    const driveFolderId = requestRow[0]?.driveFolderId;
    if (!driveFolderId) {
      return NextResponse.json({ error: 'Pasta do Google Drive não encontrada para esta requisição.' }, { status: 400 });
    }
    // Parse multipart form
    const formData = await req.formData();
    const filesData = formData.getAll('files');
    const uploadedBy = formData.get('uploadedBy')?.toString() || 'Desconhecido';
    if (!filesData || filesData.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    // Validação: máximo 5 arquivos
    if (filesData.length > 5) {
      return NextResponse.json({ error: 'Você pode anexar no máximo 5 arquivos.' }, { status: 400 });
    }
    // Validação de tipo e tamanho
    for (const file of filesData) {
      if (typeof file === 'string') continue;
      if (!['application/pdf', 'image/jpeg'].includes(file.type)) {
        return NextResponse.json({ error: `O arquivo "${file.name}" não é PDF ou JPEG.` }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: `O arquivo "${file.name}" excede 5MB.` }, { status: 400 });
      }
    }
    const results = [];
    for (const file of filesData) {
      if (typeof file === 'string') continue;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Upload para o Google Drive
      const driveFile = await uploadFileToFolder(
        buffer,
        file.name,
        file.type,
        driveFolderId
      );
      // Salvar metadados no banco
      const [dbFile] = await db.insert(files).values({
        filename: String(file.name),
        originalName: String(file.name),
        mimeType: String(file.type),
        size: Number(file.size),
        uploadedBy: String(uploadedBy),
        requestId: reqIdNum,
        driveFileId: String(driveFile.id),
      }).returning();
      results.push({
        id: dbFile.id,
        filename: dbFile.filename,
        originalName: dbFile.originalName,
        mimeType: dbFile.mimeType,
        uploadedBy: dbFile.uploadedBy,
        webViewLink: driveFile.webViewLink || '',
      });
    }
    return NextResponse.json({ success: true, files: results });
  } catch (error) {
    console.error('Erro detalhado no upload de anexos:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload de anexos.', details: String(error) }, { status: 500 });
  }
}