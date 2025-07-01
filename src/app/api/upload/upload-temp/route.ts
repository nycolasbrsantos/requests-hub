import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder } from '@/lib/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export const runtime = 'nodejs';

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

  const uploaded: any[] = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    try {
      // Converter File para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Fazer upload para o Google Drive
      const result = await uploadFileToFolder(buffer, file.name, file.type);
      // Retornar dados relevantes para o frontend
      uploaded.push({
        id: result.id,
        name: result.name,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
      });
    } catch {
      return NextResponse.json({ error: 'Falha ao enviar um ou mais arquivos.' }, { status: 500 });
    }
  }
  return NextResponse.json(uploaded, { status: 200 });
} 