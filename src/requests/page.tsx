import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { db } from '@/db'
import { requests } from '@/db/schema'
import { desc } from 'drizzle-orm'

import { columns } from './_components/columns'
import { CreateRequestDialog } from './_components/create-request-dialog'
import { DataTable } from './_components/data-table'

// A função para buscar os dados permanece a mesma
async function getRequests() {
  try {
    const data = await db.select().from(requests).orderBy(desc(requests.createdAt))
    return { data }
  } catch (error) {
    console.error(error)
    return { error: 'Não foi possível buscar as requisições.' }
  }
}

export default async function RequestsHubPage() {
  const { data, error } = await getRequests()

  // Envolvemos todo o conteúdo da página em um container div para centralização
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <Toaster richColors />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Hub de Requisições</CardTitle>
              <CardDescription className="mt-1">
                Crie e gerencie suas ordens de compra, manutenção e tickets de
                T.I.
              </CardDescription>
            </div>
            <CreateRequestDialog />
          </div>
        </CardHeader>
        <CardContent>
          {error || !data ? (
            <div className="flex h-60 items-center justify-center">
              <p className="text-red-500">{error || 'Erro ao carregar dados.'}</p>
            </div>
          ) : (
            <DataTable columns={columns} data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
