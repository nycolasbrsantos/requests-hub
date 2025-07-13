import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder } from '@/lib/google-drive';

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const poNumber = formData.get('poNumber') as string | null;
    const prFolderId = formData.get('prFolderId') as string | null;

    if (!file || !poNumber || !prFolderId) {
      return NextResponse.json({ error: 'Dados incompletos para upload.' }, { status: 400 });
    }

    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para a pasta da PO (crie a pasta se necessário)
    // Aqui, por simplicidade, vamos subir direto na pasta da PO (já criada)
    const uploadedFile = await uploadFileToFolder(
      buffer,
      file.name,
      file.type,
      prFolderId
    );

    return NextResponse.json({
      id: uploadedFile.id,
      name: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
    });
  } catch (error) {
    console.error('Erro no upload da PO:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.' }, { status: 500 });
  }
}; 