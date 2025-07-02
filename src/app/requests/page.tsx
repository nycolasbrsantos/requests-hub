import { PageContainer } from '@/components/ui/page-container';
import { db } from '@/db';
import { requests, purchaseRequests, maintenanceRequests, itSupportRequests } from '@/db/schema';
import { Request } from '@/db/schema';
import RequestsTable from './_components/RequestsTable';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RequestsPage() {
  // Busca todas as requisições principais
  const data: Request[] = await db.select().from(requests);

  // Busca dados das tabelas filhas
  const purchaseData = await db.select().from(purchaseRequests);
  const maintenanceData = await db.select().from(maintenanceRequests);
  const itSupportData = await db.select().from(itSupportRequests);

  // Cria um map para acesso rápido
  const purchaseMap = new Map(purchaseData.map((r) => [r.requestId, r]));
  const maintenanceMap = new Map(maintenanceData.map((r) => [r.requestId, r]));
  const itSupportMap = new Map(itSupportData.map((r) => [r.requestId, r]));

  // Enriquecer cada request com dados da tabela filha correspondente
  const enriched = data.map((req) => {
    if (req.type === 'purchase') {
      return { ...req, ...purchaseMap.get(req.id) };
    }
    if (req.type === 'maintenance') {
      return { ...req, ...maintenanceMap.get(req.id) };
    }
    if (["it_support", "it_ticket"].includes(req.type as string)) {
      return { ...req, ...itSupportMap.get(req.id) };
    }
    return req;
  });

  return (
    <PageContainer className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="shadow-lg w-full max-w-3xl">
        <CardHeader>
          <Link href="/home">
            <Button variant="outline" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Home
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">Requisições</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestsTable requests={enriched} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}