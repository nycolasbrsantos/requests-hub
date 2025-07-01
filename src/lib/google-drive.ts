import { google } from 'googleapis';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || 'google-service-account.json';

// Função para obter cliente do Google Drive (se não existir)
export function getDriveClient() {
  const keyFilePath = path.join(process.cwd(), KEYFILE);
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: SCOPES,
  });
  return google.drive({ version: 'v3', auth });
}

// Função para verificar se uma pasta existe
export async function folderExists(folderId: string): Promise<boolean> {
  try {
    const drive = getDriveClient();
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType',
    });
    return response.data.mimeType === 'application/vnd.google-apps.folder';
  } catch (error) {
    console.error('Erro ao verificar pasta:', error);
    return false;
  }
}

// Função para criar pasta (melhorada)
export async function createFolder(name: string, parentId?: string): Promise<string> {
  const drive = getDriveClient();
  if (parentId) {
    const parentExists = await folderExists(parentId);
    if (!parentExists) {
      throw new Error(`Pasta pai com ID ${parentId} não encontrada ou inacessível. Verifique se a conta de serviço tem permissão para acessar esta pasta.`);
    }
  }
  const requestBody: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    requestBody.parents = [parentId];
  }
  const res = await drive.files.create({
    requestBody,
    fields: 'id,name',
  });
  if (!res.data.id) {
    throw new Error('Erro ao criar pasta: ID não retornado');
  }
  return res.data.id;
}

// Função para fazer upload de arquivo (robusta)
export async function uploadFileToFolder(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentId?: string
) {
  const drive = getDriveClient();
  if (parentId) {
    const parentExists = await folderExists(parentId);
    if (!parentExists) {
      throw new Error(`Pasta pai com ID ${parentId} não encontrada ou inacessível. Verifique se a conta de serviço tem permissão para acessar esta pasta.`);
    }
  }
  const requestBody: Record<string, unknown> = {
    name: fileName,
  };
  if (parentId) {
    requestBody.parents = [parentId];
  }
  const media = {
    mimeType,
    body: fileBuffer,
  };
  const res = await drive.files.create({
    requestBody,
    media,
    fields: 'id,name,webViewLink,webContentLink',
  });
  return res.data;
}

// Função para listar arquivos em uma pasta
export async function listFilesInFolder(folderId: string) {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `parents in '${folderId}' and trashed=false`,
    fields: 'files(id,name,mimeType,size,createdTime,webViewLink)',
    orderBy: 'createdTime desc',
  });
  return response.data.files || [];
}

// Função para deletar arquivo
export async function deleteFile(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

// Função para obter informações de um arquivo
export async function getFileInfo(fileId: string) {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,createdTime,webViewLink,webContentLink',
  });
  return response.data;
} 
 