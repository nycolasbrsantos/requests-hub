import { PageContainer } from '@/components/ui/page-container';
import { db } from '@/db';
import { purchaseRequests, maintenanceRequests, RequestType, requests } from '@/db/schema';
import RequestsTable from './_components/RequestsTable';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function RequestsPage() {
  // Busca todas as requisições principais
  const data: RequestType[] = await db.select().from(requests);

  // Busca dados das tabelas filhas
  const purchaseData = await db.select().from(purchaseRequests);
  const maintenanceData = await db.select().from(maintenanceRequests);

  // Cria um map para acesso rápido
  const purchaseMap = new Map(purchaseData.map((r) => [r.requestId, r]));
  const maintenanceMap = new Map(maintenanceData.map((r) => [r.requestId, r]));

  // Enriquecer cada request com dados da tabela filha correspondente
  const enriched = data.map((req) => {
    if (req.type === 'purchase') {
      return { ...req, ...purchaseMap.get(req.id) };
    }
    if (req.type === 'maintenance') {
      return { ...req, ...maintenanceMap.get(req.id) };
    }
    // Para 'service', não há tabela filha, retorna apenas os dados principais
    return req;
  });

  // Filtrar por status
  const pendingRequests = enriched.filter(r => r.status === 'pending');
  const approvedRequests = enriched.filter(r => ['need_approved', 'finance_approved'].includes(r.status));
  const awaitingDeliveryRequests = enriched.filter(r => r.status === 'awaiting_delivery');
  const inProgressRequests = enriched.filter(r => r.status === 'in_progress');
  const finishedRequests = enriched.filter(r => ['completed', 'rejected'].includes(r.status));

  return (
    <PageContainer className="flex items-center justify-center">
      <Card className="shadow-lg w-full max-w-5xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button variant="outline" className="flex items-center gap-2" aria-label="Back to Home">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold">Requests Panel</CardTitle>
                <p className="text-muted-foreground text-sm">Track the status of your requests, filter by status or type, and access details or history.</p>
              </div>
            </div>
          </div>
          {/* Botão Nova Requisição será renderizado no RequestsTable para acesso ao role */}
        </CardHeader>
        <CardContent>
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold">Pending</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{pendingRequests.length}</span>
              </div>
              <RequestsTable requests={pendingRequests} />
            </section>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold">Approved</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{approvedRequests.length}</span>
              </div>
              <RequestsTable requests={approvedRequests} />
            </section>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold">In Progress</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{inProgressRequests.length}</span>
              </div>
              <RequestsTable requests={inProgressRequests} />
            </section>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold">Awaiting Delivery</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{awaitingDeliveryRequests.length}</span>
              </div>
              <RequestsTable requests={awaitingDeliveryRequests} />
            </section>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold">Completed / Rejected</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{finishedRequests.length}</span>
              </div>
              <RequestsTable requests={finishedRequests} />
            </section>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}