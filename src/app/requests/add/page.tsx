'use client'
import React, { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
// import { CreateRequestForm } from './_components/CreateRequestForm'
import { ArrowLeft, ShoppingCart, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PurchaseRequestForm } from './_components/PurchaseRequestForm';
import { MaintenanceRequestForm } from './_components/MaintenanceRequestForm';
import { ServiceRequestForm } from './_components/ServiceRequestForm';

export default function AddRequestPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name || ''
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get('type');

  let icon = <ShoppingCart className="w-8 h-8 text-primary" />;
  let title = 'New Request';
  let subtitle = 'Fill out the form below to request a new request. Please be detailed to speed up processing.';
  let FormComponent = null;
  if (type === 'maintenance') {
    icon = <Wrench className="w-8 h-8 text-primary" />;
    title = 'New Maintenance Request';
    subtitle = 'Fill out the form below to request new maintenance. Please be detailed to speed up processing.';
    FormComponent = <MaintenanceRequestForm requesterName={userName} setIsLoading={setIsLoading} />;
  } else if (type === 'service') {
    FormComponent = <ServiceRequestForm requesterName={userName} setIsLoading={setIsLoading} />;
    title = 'New Service Request';
    subtitle = 'Fill out the form below to request a new service.';
  } else {
    FormComponent = <PurchaseRequestForm requesterName={userName} setIsLoading={setIsLoading} />;
    title = 'New Purchase Request';
    subtitle = 'Fill out the form below to request a new purchase.';
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
          <div className="flex items-center gap-3 mt-2">
            {icon}
            <CardTitle className="text-3xl font-extrabold text-primary tracking-tight">{title}</CardTitle>
          </div>
          <p className="text-muted-foreground text-base mt-1 mb-2 text-center max-w-xl">{subtitle}</p>
        </CardHeader>
        <CardContent className="pt-0 pb-8 px-6 sm:px-10">
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
              Sending request<span className="inline-block animate-bounce">...</span>
            </span>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
