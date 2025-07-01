import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToFolder, createFolder, folderExists, getDriveClient } from '@/lib/google-drive';
import { db } from '@/db';
import { files } from '@/db/schema';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Função para verificar e obter pasta raiz válida
async function getValidRootFolderId(): Promise<string> {
  if (!ROOT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não está configurado no .env.local');
  }

  // Verificar se a pasta raiz existe e é acessível
  const exists = await folderExists(ROOT_FOLDER_ID);
  if (!exists) {
    throw new Error(`Pasta raiz com ID ${ROOT_FOLDER_ID} não encontrada ou inacessível. Verifique se a conta de serviço tem permissão para acessar esta pasta.`);
  }

  return ROOT_FOLDER_ID;
}

// Função para obter ou criar pasta da requisição
async function getOrCreateRequestFolder(requestId: number): Promise<string> {
  const rootFolderId = await getValidRootFolderId();
  const folderName = `Requisicao-${requestId}`;

  try {
    // Tentar encontrar pasta existente primeiro
    const drive = getDriveClient();
    const response = await drive.files.list({
      q: `name='${folderName}' and parents in '${rootFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      console.log(`Pasta existente encontrada: ${folderName} (ID: ${response.data.files[0].id})`);
      return response.data.files[0].id!;
    }

    // Criar nova pasta se não existir
    console.log(`Criando nova pasta: ${folderName}`);
    const folderId = await createFolder(folderName, rootFolderId);
    console.log(`Pasta criada com sucesso: ${folderName} (ID: ${folderId})`);
    
    return folderId;
  } catch (error) {
    console.error('Erro ao obter/criar pasta da requisição:', error);
    throw error;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: { requestId: string } }
) {
  try {
    // 1. Validar parâmetros
    const { params } = context;
    const { requestId } = await params;
    const reqIdNum = Number(requestId);
    
    if (isNaN(reqIdNum) || reqIdNum <= 0) {
      return NextResponse.json({ 
        error: 'ID da requisição inválido',
        details: 'O ID deve ser um número positivo'
      }, { status: 400 });
    }

    // 2. Obter dados do formulário
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = formData.get('uploadedBy') as string | null;

    if (!file) {
      return NextResponse.json({ 
        error: 'Nenhum arquivo fornecido',
        details: 'Selecione um arquivo para upload'
      }, { status: 400 });
    }

    if (!uploadedBy) {
      return NextResponse.json({ 
        error: 'Campo uploadedBy é obrigatório',
        details: 'Informe quem está fazendo o upload'
      }, { status: 400 });
    }

    // 3. Validar arquivo
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande',
        details: `Tamanho máximo permitido: 50MB. Arquivo atual: ${Math.round(file.size / 1024 / 1024)}MB`
      }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ 
        error: 'Arquivo vazio',
        details: 'O arquivo selecionado está vazio'
      }, { status: 400 });
    }

    // Validar tipos de arquivo permitidos (opcional)
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
      'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type) && file.type !== '') {
      console.warn(`Tipo de arquivo não validado: ${file.type} para arquivo ${file.name}`);
      // Não bloquear, apenas logar para monitoramento
    }

    console.log(`Iniciando upload: ${file.name} (${file.size} bytes, ${file.type})`);

    // 4. Obter ou criar pasta da requisição no Drive
    const folderId = await getOrCreateRequestFolder(reqIdNum);

    // 5. Preparar arquivo para upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Upload para o Drive
    console.log(`Fazendo upload para pasta ID: ${folderId}`);
    const driveFile = await uploadFileToFolder(
      buffer,
      file.name,
      file.type || 'application/octet-stream',
      folderId
    );

    if (!driveFile.id) {
      throw new Error('Upload falhou: ID do arquivo não retornado pelo Google Drive');
    }

    console.log(`Upload concluído: ${file.name} (Drive ID: ${driveFile.id})`);

    // 7. Salvar metadados no banco
    const fileRecord = await db.insert(files).values({
      filename: file.name,                    // Nome original do arquivo
      driveFileId: driveFile.id,             // ID do Google Drive
      originalName: file.name,               // Nome original (redundante, mas mantendo compatibilidade)
      mimeType: file.type || 'application/octet-stream',
      size: buffer.length,
      uploadedBy,
      requestId: reqIdNum,
      createdAt: new Date(),
    }).returning();

    console.log(`Metadados salvos no banco: ID ${fileRecord[0]?.id}`);

    // 8. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      file: {
        id: fileRecord[0]?.id,
        filename: file.name,
        size: buffer.length,
        mimeType: file.type,
      },
      driveFile: {
        id: driveFile.id,
        name: driveFile.name,
        webViewLink: driveFile.webViewLink,
        webContentLink: driveFile.webContentLink,
      },
    });

  } catch (error) {
    console.error('Erro detalhado no upload:', error);
    
    // Tratamento de erros específicos
    let errorMessage = 'Erro interno do servidor';
    let details = '';
    let statusCode = 500;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('file not found') || errorMsg.includes('não encontrada')) {
        errorMessage = 'Pasta no Google Drive não encontrada ou inacessível';
        details = 'Verifique se a conta de serviço tem permissão para acessar a pasta especificada';
        statusCode = 404;
      } else if (errorMsg.includes('insufficient permission') || errorMsg.includes('permiss')) {
        errorMessage = 'Permissões insuficientes no Google Drive';
        details = 'A conta de serviço precisa de permissões de editor na pasta do Google Drive';
        statusCode = 403;
      } else if (errorMsg.includes('quota exceeded') || errorMsg.includes('cota')) {
        errorMessage = 'Cota do Google Drive excedida';
        details = 'Verifique o espaço disponível na conta do Google Drive';
        statusCode = 507;
      } else if (errorMsg.includes('não está configurado')) {
        errorMessage = 'Configuração incompleta';
        details = error.message;
        statusCode = 500;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: details || undefined,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });
  }
} 