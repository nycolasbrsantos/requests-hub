// src/app/(protected)/requests/add/_components/CreateRequestForm.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { PurchaseRequestForm } from '@/app/requests/add/_components/PurchaseRequestForm'
import { ItSupportRequestForm } from '@/app/requests/add/_components/ItSupportRequestForm'
import { MaintenanceRequestForm } from '@/app/requests/add/_components/MaintenanceRequestForm'

const REQUEST_TYPES = [
  { value: 'purchase', label: 'Compras' },
  { value: 'it_support', label: 'Suporte de T.I.' },
  { value: 'maintenance', label: 'Manutenção Predial' },
] as const;

type RequestType = typeof REQUEST_TYPES[number]['value'];

interface CreateRequestFormProps {
  requesterName: string;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CreateRequestForm({ requesterName, isLoading, setIsLoading }: CreateRequestFormProps) {
  const params = useSearchParams();
  const tp = params.get('type') as RequestType | null;
  const requestType: RequestType | null = tp && REQUEST_TYPES.some(t => t.value === tp) ? tp : null;

  if (!requestType) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-6 rounded bg-red-100 text-red-800 border border-red-300 text-center">
        Tipo de requisição inválido. Volte à página inicial e selecione um serviço válido.
      </div>
    );
  }

  return (
    <div className="relative">
      {requestType === 'purchase' && (
        <PurchaseRequestForm requesterName={requesterName} isLoading={isLoading} setIsLoading={setIsLoading} />
      )}
      {requestType === 'it_support' && (
        <ItSupportRequestForm />
      )}
      {requestType === 'maintenance' && (
        <MaintenanceRequestForm requesterName={requesterName} isLoading={isLoading} setIsLoading={setIsLoading} />
      )}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-xl">
          <svg className="animate-spin h-12 w-12 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}
    </div>
  );
}
