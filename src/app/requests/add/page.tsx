'use client'
import React, { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { CreateRequestForm } from './_components/CreateRequestForm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AddRequestPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name || ''
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  return (
    <PageContainer className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="shadow-lg w-full max-w-3xl my-8 relative">
        <CardHeader>
          <Button
            variant="outline"
            className="mb-4 flex items-center gap-2"
            disabled={isLoading}
            onClick={() => {
              if (!isLoading) router.push('/home');
            }}
            tabIndex={isLoading ? -1 : 0}
            aria-disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Home
          </Button>
          <CardTitle className="text-2xl font-bold">Nova Requisição de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateRequestForm requesterName={userName} isLoading={isLoading} setIsLoading={setIsLoading} />
        </CardContent>
      </Card>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-16 w-16 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-white mt-4 text-lg font-medium">Enviando requisição...</span>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
