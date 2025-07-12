import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function setUserAsAdmin(email: string) {
  try {
    const result = await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email))
      .returning();

    if (result.length > 0) {
      console.log(`✅ Usuário ${email} definido como admin com sucesso!`);
    } else {
      console.log(`❌ Usuário ${email} não encontrado no banco.`);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
  }
}

// Substitua pelo seu email
const userEmail = 'seu-email@biseagles.com';

setUserAsAdmin(userEmail); 