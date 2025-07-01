import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo maior que 10MB.' }, { status: 400 });
  }
  // Garante que a pasta existe
  mkdirSync(UPLOAD_DIR, { recursive: true });
  // Gera nome único
  const ext = extname(file.name);
  const base = file.name.replace(/\.[^/.]+$/, '');
  const unique = `${base}-${Date.now()}${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(join(UPLOAD_DIR, unique), buffer);
  return NextResponse.json({ filename: unique });
} 