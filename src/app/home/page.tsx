"use client";
import { PageContainer } from '@/components/ui/page-container';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function ProtectedHomePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === 'admin';
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome to the Service Portal</h1>
        {session?.user?.name && (
          <p className="text-lg font-medium text-center mb-1">Hello, {session.user.name}!</p>
        )}
        <p className="text-muted-foreground mb-8 text-center">You can create a new request for products, services, or maintenance.</p>
        <div className="flex flex-col items-center w-full max-w-3xl">
          <a
            href="/requests/add"
            className="inline-block px-8 py-4 bg-primary text-white rounded-lg text-lg font-semibold shadow hover:bg-primary/90 transition mb-8"
          >
            + New Request
          </a>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <a href="/requests" className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">Requests Panel</a>
          {isAdmin && (
            <a href="/admin/users" className="inline-block px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Admin Panel</a>
          )}
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </PageContainer>
  );
} 