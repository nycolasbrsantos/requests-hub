/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder, createFolder, folderExists, getDriveClient } from '@/lib/google-drive';
import { db } from '@/db';
import { files } from '@/db/schema';

const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Função para verificar e obter pasta raiz válida
async function getValidRootFolderId(): Promise<string> {
  if (!GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não está configurado no .env.local');
  }
  const exists = await folderExists(GOOGLE_DRIVE_ROOT_FOLDER_ID);
  if (!exists) {
    throw new Error(`Pasta raiz com ID ${GOOGLE_DRIVE_ROOT_FOLDER_ID} não encontrada ou inacessível. Verifique se a conta de serviço tem permissão para acessar esta pasta.`);
  }
  return GOOGLE_DRIVE_ROOT_FOLDER_ID;
}

// Função para obter ou criar pasta da requisição
async function getOrCreateRequestFolder(requestId: number): Promise<string> {
  const rootFolderId = await getValidRootFolderId();
  const folderName = `Requisicao-${requestId}`;
  try {
    const drive = await getDriveClient();
    const response = await drive.files.list({
      q: `name='${folderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
    });
    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }
    const folderId = await createFolder(folderName, rootFolderId);
    return folderId;
  } catch (error) {
    console.error('Erro ao obter/criar pasta da requisição:', error);
    throw error;
  }
}

export async function POST(req: NextRequest, context: any) {
  const { params } = await context;
  const requestId = params.requestId;
  const reqIdNum = Number(requestId);
  if (isNaN(reqIdNum) || reqIdNum <= 0) {
    console.error('ID da requisição inválido:', requestId);
    return NextResponse.json({
      error: 'ID da requisição inválido',
      details: 'O ID deve ser um número positivo',
    }, { status: 400 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const uploadedBy = formData.get('uploadedBy') as string | null;
  if (!file) {
    console.error('Nenhum arquivo fornecido no upload. formData:', formData);
    return NextResponse.json({
      error: 'Nenhum arquivo fornecido',
    }, { status: 400 });
  }
  if (!uploadedBy) {
    console.error('Campo uploadedBy ausente no upload. formData:', formData);
    return NextResponse.json({
      error: 'Campo uploadedBy ausente',
    }, { status: 400 });
  }
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return NextResponse.json({
      error: 'Arquivo muito grande',
      details: `Tamanho máximo permitido: 50MB. Arquivo atual: ${Math.round(file.size / 1024 / 1024)}MB`,
    }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({
      error: 'Arquivo vazio',
      details: 'O arquivo selecionado está vazio',
    }, { status: 400 });
  }
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ];
  if (!allowedTypes.includes(file.type) && file.type !== '') {
    console.warn(`Tipo de arquivo não validado: ${file.type} para arquivo ${file.name}`);
  }
  // Adicione logs após cada etapa crítica
  try {
    const folderId = await getOrCreateRequestFolder(reqIdNum);
    console.log('Pasta do Google Drive obtida/criada:', folderId);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const driveFile = await uploadFileToFolder(
      buffer,
      file.name,
      file.type,
      folderId
    );
    console.log('Arquivo enviado ao Google Drive:', driveFile);
    const [dbFile] = await db.insert(files).values({
      filename: String(file.name),
      originalName: String(file.name),
      mimeType: String(file.type),
      size: Number(file.size),
      uploadedBy: String(uploadedBy),
      requestId: reqIdNum,
      driveFileId: String(driveFile.id),
    }).returning();
    console.log('Arquivo salvo no banco:', dbFile);
    return NextResponse.json({ success: true, file: dbFile });
  } catch (error) {
    console.error('Erro detalhado no upload:', error);
    return NextResponse.json({ error: 'Erro ao processar upload', details: String(error) }, { status: 500 });
  }
}