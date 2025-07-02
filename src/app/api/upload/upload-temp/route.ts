import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder } from '@/lib/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export const runtime = 'nodejs';

type UploadedFile = {
  id?: string;
  name?: string;
  webViewLink?: string;
  webContentLink?: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll('files');
  if (!files || files.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const uploaded: UploadedFile[] = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    // Validação de tipo e tamanho
    const allowedTypes = ['application/pdf', 'image/jpeg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de arquivo não permitido: ${file.name} (${file.type})` }, { status: 400 });
    }
    if (file.size > maxSize) {
      return NextResponse.json({ error: `Arquivo muito grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 5MB.` }, { status: 400 });
    }
    try {
      // Converter File para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Fazer upload para o Google Drive
      const parentId = process.env.DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      const result = await uploadFileToFolder(buffer, file.name, file.type, parentId);
      // Retornar dados relevantes para o frontend
      uploaded.push({
        id: result.id ?? undefined,
        name: result.name ?? undefined,
        webViewLink: result.webViewLink ?? undefined,
        webContentLink: result.webContentLink ?? undefined,
      });
    } catch (error) {
      console.error('Erro detalhado no upload:', error);
      return NextResponse.json({ error: 'Erro ao processar upload', details: String(error) }, { status: 500 });
    }
  }
  return NextResponse.json(uploaded, { status: 200 });
} 