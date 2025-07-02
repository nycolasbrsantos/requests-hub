"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { PageContainer } from '@/components/ui/page-container';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status, router]);

  return (
    <PageContainer>
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Acessar o Portal</CardTitle>
            <CardDescription className="text-center">Use sua conta Google @biseagles.com</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 justify-center"
              onClick={() => signIn('google')}
            >
              <FcGoogle className="w-5 h-5" />
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}