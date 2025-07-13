import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role?: 'admin' | 'supervisor' | 'manager' | 'user';
    } & DefaultSession['user'];
  }
} 