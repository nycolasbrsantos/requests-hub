import { NextResponse } from 'next/server';
import { generatePONumber } from '@/lib/generate-po-number';

export const GET = async () => {
  try {
    const poNumber = await generatePONumber();
    return NextResponse.json({ poNumber });
  } catch (error) {
    console.error('Erro ao gerar número da PO:', error);
    return NextResponse.json({ error: 'Erro ao gerar número da PO' }, { status: 500 });
  }
}; 