import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder, createFolder } from '@/lib/google-drive';
import { db } from '@/db';
import { files } from '@/db/schema';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

export async function POST(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = Number(params.requestId);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = formData.get('uploadedBy') as string | null;

    if (!file || !uploadedBy) {
      return NextResponse.json({ error: 'Arquivo ou usuário não enviado.' }, { status: 400 });
    }

    // 1. Cria/recupera pasta da requisição no Drive
    const folderName = `Requisicao-${requestId}`;
    const folderId = await createFolder(folderName, ROOT_FOLDER_ID);

    // 2. Upload para o Drive
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const driveFile = await uploadFileToFolder(
      buffer,
      file.name,
      file.type,
      folderId
    );

    // 3. Salva metadados no banco
    await db.insert(files).values({
      filename: driveFile.id!,
      originalName: file.name,
      mimeType: file.type,
      size: buffer.length,
      data: '', // Não armazene o binário, só referência
      uploadedBy,
      requestId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      driveFileId: driveFile.id,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao fazer upload.' }, { status: 500 });
  }
} 