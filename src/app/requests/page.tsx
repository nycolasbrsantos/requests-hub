import { PageContainer } from '@/components/ui/page-container';
import { db } from '@/db';
import { requests, purchaseRequests, maintenanceRequests, itSupportRequests } from '@/db/schema';
import { Request } from '@/db/schema';
import RequestsTable from './_components/RequestsTable';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    <PageContainer className="flex items-center justify-center">
      <Card className="shadow-lg w-full max-w-5xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button variant="outline" className="flex items-center gap-2" aria-label="Voltar para Home">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold">Painel de Requisições</CardTitle>
                <p className="text-muted-foreground text-sm">Acompanhe o status das suas requisições, filtre por status ou tipo e acesse detalhes ou histórico.</p>
              </div>
            </div>
          </div>
          {/* Botão Nova Requisição será renderizado no RequestsTable para acesso ao role */}
        </CardHeader>
        <CardContent>
          <RequestsTable requests={enriched} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}