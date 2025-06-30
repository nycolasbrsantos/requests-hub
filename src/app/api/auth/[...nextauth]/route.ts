import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { NextAuthOptions } from 'next-auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Restringe o login para contas do domínio biseagles.com
          hd: 'biseagles.com',
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Garante que só emails do domínio biseagles.com podem logar
      if (user.email && user.email.endsWith('@biseagles.com')) {
        // Cria usuário no banco se não existir
        const existing = await db.select().from(users).where(eq(users.email, user.email));
        if (existing.length === 0) {
          await db.insert(users).values({
            name: user.name || '',
            email: user.email,
            role: 'user',
          });
        }
        return true;
      }
      return false;
    },
    async session({ session, token, user }) {
      // Busca o usuário no banco e inclui o role na sessão
      if (session.user?.email) {
        const found = await db.select().from(users).where(eq(users.email, session.user.email));
        if (found.length > 0) {
          session.user.role = found[0].role;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 