import { google } from 'googleapis';
import path from 'path';

const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || 'bishub-464620-3c7dd106123d.json';
const keyFilePath = path.join(process.cwd(), KEYFILE);

async function logServiceAccountEmail() {
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const serviceAccountEmail = (await auth.getCredentials()).client_email;
  console.log('Conta de serviço autenticada:', serviceAccountEmail);
}

logServiceAccountEmail(); 