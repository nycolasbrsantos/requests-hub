import { db } from '@/db';
import { requests } from '@/db/schema';
import { and, gte, lte, isNotNull } from 'drizzle-orm';

/**
 * Gera um número de PO sequencial baseado no ano atual
 * Formato: PO-YYYY-XXXX (ex: PO-2024-0001)
 */
export async function generatePONumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  
  // Buscar POs do ano atual
  const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  
  const posThisYear = await db
    .select()
    .from(requests)
    .where(
      and(
        gte(requests.createdAt, startOfYear),
        lte(requests.createdAt, endOfYear),
        isNotNull(requests.poNumber)
      )
    );

  // Contar quantas POs já existem este ano
  const poCount = posThisYear.length + 1;
  
  // Formatar com zeros à esquerda (4 dígitos)
  const poNumber = `PO-${year}-${String(poCount).padStart(4, '0')}`;
  
  return poNumber;
} 