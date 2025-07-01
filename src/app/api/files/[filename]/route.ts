import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { or, sql } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Diretório de uploads fora da pasta public
const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { filename } = params;
    if (!filename) {
      return NextResponse.json({ error: 'Nome do arquivo não fornecido' }, { status: 400 });
    }

    // 2. Verificar se o arquivo existe
    const filePath = join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // 3. Verificar autorização - o usuário deve ter acesso à requisição que contém este arquivo
    const requestsWithFile = await db
      .select()
      .from(requests)
      .where(
        or(
          // Arquivo está nos anexos da requisição (usando SQL raw para verificar JSON)
          sql`${requests.attachments}::text LIKE ${`%"filename":"${filename}"%`}`,
          // Ou o usuário é admin/supervisor
          sql`${session.user.role} IN ('admin', 'supervisor')`
        )
      );

    if (requestsWithFile.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 4. Determinar o tipo MIME baseado na extensão
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }

    // 5. Ler e retornar o arquivo
    const fileBuffer = readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache por 1 hora
      },
    });

  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 