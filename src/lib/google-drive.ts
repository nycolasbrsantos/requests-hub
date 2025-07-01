import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || 'google-service-account.json';

export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: SCOPES,
  });
  return google.drive({ version: 'v3', auth });
}

export async function createFolder(name: string, parentId: string) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return res.data.id!;
}

export async function uploadFileToFolder(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fileBuffer,
    },
    fields: 'id,webViewLink,webContentLink',
  });
  return res.data;
}

export async function deleteFile(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
} 