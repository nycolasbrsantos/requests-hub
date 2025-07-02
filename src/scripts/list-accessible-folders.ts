import { google } from 'googleapis';
import path from 'path';

const KEYFILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE || process.env.DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'bishub-464620-3c7dd106123d.json';
const keyFilePath = path.join(process.cwd(), KEYFILE);

async function listAccessibleFolders() {
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  // Listar unidades compartilhadas
  const sharedDrivesRes = await drive.drives.list();
  console.log('Unidades compartilhadas acessíveis:');
  if (sharedDrivesRes.data.drives && sharedDrivesRes.data.drives.length > 0) {
    sharedDrivesRes.data.drives.forEach((d) => {
      console.log(`- [${d.id}] ${d.name}`);
    });
  } else {
    console.log('Nenhuma unidade compartilhada acessível encontrada.');
  }

  // Listar pastas na raiz de cada unidade compartilhada
  if (sharedDrivesRes.data.drives) {
    for (const driveInfo of sharedDrivesRes.data.drives) {
      const foldersRes = await drive.files.list({
        corpora: 'drive',
        driveId: driveInfo.id!,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
      });
      console.log(`\nPastas na unidade compartilhada "${driveInfo.name}":`);
      if (foldersRes.data.files && foldersRes.data.files.length > 0) {
        foldersRes.data.files.forEach((f) => {
          console.log(`  - [${f.id}] ${f.name}`);
        });
      } else {
        console.log('  Nenhuma pasta encontrada.');
      }
    }
  }
}

listAccessibleFolders().catch((err) => {
  console.error('Erro ao listar pastas/unidades compartilhadas:', err);
}); 