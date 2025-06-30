import { PageContainer } from '@/components/ui/page-container';
import { db } from '@/db';
import { requests } from '@/db/schema';
import { Request } from '@/db/schema';
import RequestsTable from './_components/RequestsTable';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RequestsPage() {
  const data: Request[] = await db.select().from(requests);

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
          <RequestsTable requests={data} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}