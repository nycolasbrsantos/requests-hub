'use client'
import React, { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
// import { CreateRequestForm } from './_components/CreateRequestForm'
import { ArrowLeft, ShoppingCart, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PurchaseRequestForm } from './_components/PurchaseRequestForm';
import { MaintenanceRequestForm } from './_components/MaintenanceRequestForm';
// import { ServiceRequestForm } from './_components/ServiceRequestForm';

export default function AddRequestPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || '';
  const [selectedType, setSelectedType] = useState<'purchaseOrService' | 'maintenance' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  let title = 'New Request';
  let subtitle = 'Select the type of request you want to create.';
  let FormComponent = null;

  if (selectedType === 'purchaseOrService') {
    title = 'New Purchase/Service Request';
    subtitle = 'Fill out the form below to request a product, equipment, or service.';
    FormComponent = <PurchaseRequestForm requesterName={userName} setIsLoading={setIsLoading} />;
  } else if (selectedType === 'maintenance') {
    title = 'New Maintenance Request';
    subtitle = 'Fill out the form below to request maintenance.';
    FormComponent = <MaintenanceRequestForm requesterName={userName} setIsLoading={setIsLoading} />;
  }

  return (
    <PageContainer className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Card className="shadow-2xl w-full max-w-3xl my-12 rounded-2xl border border-primary/20 bg-white/90 transition-all px-2 sm:px-0">
        <CardHeader className="pb-2 flex flex-col items-center gap-2">
          <Button
            variant="outline"
            className="mb-2 self-start flex items-center gap-2"
            disabled={isLoading}
            onClick={() => {
              if (!isLoading) router.push('/home');
            }}
            tabIndex={isLoading ? -1 : 0}
            aria-disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <CardTitle className="text-3xl font-extrabold text-primary tracking-tight">{title}</CardTitle>
          <p className="text-muted-foreground text-base mt-1 mb-2 text-center max-w-xl">{subtitle}</p>
        </CardHeader>
        <CardContent className="pt-0 pb-8 px-6 sm:px-10">
          {!selectedType && (
            <div className="flex flex-col gap-6 items-center justify-center py-8">
              <Button
                className="w-full max-w-xs flex items-center gap-3 text-lg"
                variant="default"
                onClick={() => setSelectedType('purchaseOrService')}
                disabled={isLoading}
              >
                <ShoppingCart className="w-6 h-6" /> New Purchase/Service Request
              </Button>
              <Button
                className="w-full max-w-xs flex items-center gap-3 text-lg"
                variant="secondary"
                onClick={() => setSelectedType('maintenance')}
                disabled={isLoading}
              >
                <Wrench className="w-6 h-6" /> New Maintenance Request
              </Button>
            </div>
          )}
          {FormComponent}
        </CardContent>
      </Card>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-200/60 via-white/80 to-blue-400/60 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-20 w-20 text-primary drop-shadow-xl" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-primary mt-6 text-xl font-semibold animate-pulse select-none">
              Enviando requisição<span className="inline-block animate-bounce">...</span>
            </span>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
