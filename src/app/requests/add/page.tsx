import React from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { getCurrentUser } from '@/lib/auth'
import { CreateRequestForm } from './_components/CreateRequestForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Criar nova requisição' }

export default async function AddRequestPage() {
  const user = await getCurrentUser()
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <PageContainer>
        <div className="max-w-3xl mx-auto py-8">
          <Card className="shadow-lg">
            <CardHeader>
              <Link href="/home">
                <Button variant="outline" className="mb-4 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para Home
                </Button>
              </Link>
              <CardTitle className="text-2xl font-bold">Nova Requisição de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateRequestForm requesterName={user.name} />
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  )
}
