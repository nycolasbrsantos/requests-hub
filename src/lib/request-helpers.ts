import { db } from '@/db';
import { requests } from '@/db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';

export async function generateCustomId(type: 'purchase' | 'service' | 'maintenance'): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;

  let prefix = 'PR';
  if (type === 'service') prefix = 'SR';
  if (type === 'maintenance') prefix = 'MR';

  const start = new Date(y, now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(y, now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const requestsToday = await db
    .select()
    .from(requests)
    .where(
      and(
        gte(requests.createdAt, start),
        lte(requests.createdAt, end),
        eq(requests.type, type)
      )
    );
  const seq = String(requestsToday.length + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

