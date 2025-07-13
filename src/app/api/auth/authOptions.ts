import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email));

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
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
      } else if (account?.provider === 'credentials') {
        // Para o CredentialsProvider, o authorize já lida com a validação
        return true;
      }
      return false;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const found = await db.select().from(users).where(eq(users.email, session.user.email));
        if (found.length > 0) {
          session.user.role = found[0].role;
          session.user.id = found[0].id;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};


