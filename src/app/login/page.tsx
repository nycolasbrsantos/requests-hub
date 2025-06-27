"use client";

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
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
  );
} 