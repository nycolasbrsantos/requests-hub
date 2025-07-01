import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || 'google-service-account.json';
const FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

async function main() {
  if (!FOLDER_ID) {
    console.error('GOOGLE_DRIVE_ROOT_FOLDER_ID não definida');
    process.exit(1);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  try {
    const res = await drive.files.create({
      requestBody: {
        name: `Teste-${Date.now()}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FOLDER_ID],
      },
      fields: 'id, name',
    });
    console.log('Subpasta criada com sucesso:', res.data);
  } catch (err) {
    console.error('Erro ao criar subpasta no Drive:', err);
    process.exit(2);
  }
}

main(); 