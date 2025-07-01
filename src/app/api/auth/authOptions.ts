import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
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
          hd: 'biseagles.com',
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email && user.email.endsWith('@biseagles.com')) {
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
    async session({ session }) {
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
