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
}

export function CreateRequestForm({ requesterName }: CreateRequestFormProps) {
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

  if (requestType === 'purchase') {
    return <PurchaseRequestForm requesterName={requesterName} />;
  }
  if (requestType === 'it_support') {
    return <ItSupportRequestForm />;
  }
  if (requestType === 'maintenance') {
    return <MaintenanceRequestForm requesterName={requesterName} />;
  }
  return null;
}
