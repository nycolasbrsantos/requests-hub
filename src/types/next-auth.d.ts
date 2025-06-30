import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: 'admin' | 'supervisor' | 'encarregado' | 'user';
    } & DefaultSession['user'];
  }
} 