import { google } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';
import { JWT } from 'google-auth-library';
import fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || 'google-service-account.json';

// Função para obter cliente do Google Drive (se não existir)
export async function getDriveClient() {
  const keyFilePath = path.join(process.cwd(), KEYFILE);
  const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
  const auth = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: SCOPES,
    subject: 'nsantos@biseagles.com', // delegação domain-wide
  });
  return google.drive({ version: 'v3', auth });
}

// Função para verificar se uma pasta existe
export async function folderExists(folderId: string): Promise<boolean> {
  try {
    const drive = await getDriveClient();
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
  const drive = await getDriveClient();
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
  const drive = await getDriveClient();
  let parentExists = false;
  let attempts = 0;
  while (attempts < 3) {
    if (parentId) {
      parentExists = await folderExists(parentId);
      if (parentExists) break;
      console.warn(`[Google Drive] Pasta pai '${parentId}' não encontrada. Tentando novamente (${attempts + 1}/3)...`);
      await new Promise(res => setTimeout(res, 1000));
    } else {
      parentExists = true;
      break;
    }
    attempts++;
  }
  if (parentId && !parentExists) {
    throw new Error(`Pasta pai com ID ${parentId} não encontrada ou inacessível após 3 tentativas. Verifique se a conta de serviço tem permissão para acessar esta pasta.`);
  }
  const requestBody: Record<string, unknown> = {
    name: fileName,
    parents: parentId ? [parentId] : undefined,
  };
  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };
  const res = await drive.files.create({
    requestBody,
    media,
    fields: 'id,name,webViewLink,webContentLink',
    supportsAllDrives: true,
  });
  return res.data;
}

// Função para listar arquivos em uma pasta
export async function listFilesInFolder(folderId: string) {
  const drive = await getDriveClient();
  const response = await drive.files.list({
    q: `parents in '${folderId}' and trashed=false`,
    fields: 'files(id,name,mimeType,size,createdTime,webViewLink)',
    orderBy: 'createdTime desc',
  });
  return response.data.files || [];
}

// Função para deletar arquivo
export async function deleteFile(fileId: string) {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
}

// Função para obter informações de um arquivo
export async function getFileInfo(fileId: string) {
  const drive = await getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,createdTime,webViewLink,webContentLink',
  });
  return response.data;
}

/**
 * Cria uma pasta para PO dentro da pasta da PR
 * @param prFolderId - ID da pasta da PR
 * @param poNumber - Número da PO
 * @returns ID da pasta da PO criada
 */
export async function createPOFolder(prFolderId: string, poNumber: string): Promise<string> {
  try {
    const drive = await getDriveClient();
    const folderName = `PO-${poNumber}`;
    const folderMetadata = {
      name: folderName,
      parents: [prFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    };

    const response = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return response.data.id || '';
  } catch (error) {
    console.error('Erro ao criar pasta da PO:', error);
    throw new Error('Falha ao criar pasta da PO no Google Drive');
  }
}

/**
 * Move arquivos para a pasta da PO
 * @param fileIds - Array de IDs dos arquivos
 * @param poFolderId - ID da pasta da PO
 */
export async function moveFilesToPOFolder(fileIds: string[], poFolderId: string): Promise<void> {
  try {
    const drive = await getDriveClient();
    for (const fileId of fileIds) {
      await drive.files.update({
        fileId,
        addParents: poFolderId,
        removeParents: 'root', // Remove da pasta raiz
        fields: 'id, parents',
      });
    }
  } catch (error) {
    console.error('Erro ao mover arquivos para pasta da PO:', error);
    throw new Error('Falha ao mover arquivos para pasta da PO');
  }
}

/**
 * Organiza arquivos da PO: cria pasta e move arquivos
 * @param prFolderId - ID da pasta da PR
 * @param poNumber - Número da PO
 * @param fileIds - IDs dos arquivos da PO
 * @returns ID da pasta da PO
 */
export async function organizePOFiles(prFolderId: string, poNumber: string, fileIds: string[]): Promise<string> {
  try {
    // 1. Criar pasta da PO
    const poFolderId = await createPOFolder(prFolderId, poNumber);
    
    // 2. Mover arquivos para a pasta da PO
    if (fileIds.length > 0) {
      await moveFilesToPOFolder(fileIds, poFolderId);
    }
    
    return poFolderId;
  } catch (error) {
    console.error('Erro ao organizar arquivos da PO:', error);
    throw new Error('Falha ao organizar arquivos da PO');
  }
}

export function getRootFolderIdByType(type: 'purchase' | 'it_support' | 'maintenance'): string {
  let folderId: string | undefined;
  if (type === 'purchase') folderId = process.env.DRIVE_PURCHASES_FOLDER_ID;
  else if (type === 'it_support') folderId = process.env.DRIVE_SUPPORT_FOLDER_ID;
  else if (type === 'maintenance') folderId = process.env.DRIVE_MAINTENANCE_FOLDER_ID;
  else if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  }
  if (!folderId) throw new Error('Tipo de requisição inválido ou pasta raiz não definida');
  console.log(`[Google Drive] Usando pasta raiz para tipo '${type}':`, folderId);
  return folderId === 'root' ? 'root' : folderId;
} 

/**
 * Baixa o conteúdo de um arquivo do Google Drive como Buffer
 * @param fileId - ID do arquivo no Google Drive
 * @returns Buffer do arquivo
 */
export async function getFileBufferFromDrive(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  const res = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'stream' });
  const stream = res.data as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
} 
 