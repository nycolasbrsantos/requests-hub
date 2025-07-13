import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: 'admin' | 'supervisor' | 'manager' | 'user';
    } & DefaultSession['user'];
  }
} 