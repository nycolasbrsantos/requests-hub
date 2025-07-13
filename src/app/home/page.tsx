"use client";
import { PageContainer } from '@/components/ui/page-container';
import { ServiceCard } from '../requests/_components/ServiceCard';
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
        <p className="text-muted-foreground mb-8 text-center">Select the service you want to request.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
          <ServiceCard
            icon="shopping"
            title="Purchase Request"
            description="Request materials, equipment, and other items."
            href="/requests/add?type=purchase"
          />
          <ServiceCard
            icon="support"
            title="IT Support"
            description="Open a ticket for technical issues and support."
            href="/requests/add?type=support"
          />
          <ServiceCard
            icon="maintenance"
            title="Building Maintenance"
            description="Request repairs or report infrastructure issues."
            href="/requests/add?type=maintenance"
          />
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