// src/app/(protected)/requests/page.tsx
import Link from 'next/link'
import { ShoppingCart, Headset, Wrench } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/page-container'

export const metadata = {
  title: 'Portal de Requisições',
}

export default function RequestsPortalPage() {
  const cards = [
    {
      title: 'Requisição de Compras',
      description: 'Solicite materiais, equipamentos e outros itens.',
      icon: ShoppingCart,
      href: '/requests/add?type=purchase',
    },
    {
      title: 'Suporte de T.I.',
      description: 'Abra um chamado para problemas técnicos e suporte.',
      icon: Headset,
      href: '/requests/add?type=it_ticket',
    },
    {
      title: 'Manutenção Predial',
      description: 'Peça reparos ou informe sobre problemas na infraestrutura.',
      icon: Wrench,
      href: '/requests/add?type=maintenance',
    },
  ]

  return (
    <PageContainer className="py-12">
      <h1 className="text-2xl font-semibold mb-2 text-center">
        Bem-vindo(a) ao Portal de Serviços
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Selecione o serviço que deseja solicitar
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map(({ title, description, icon: Icon, href }) => (
          <Link key={title} href={href} passHref>
            <Card asChild className="cursor-pointer hover:shadow-lg transition-shadow">
              <a className="flex flex-col items-center p-6 space-y-4">
                <Icon className="w-12 h-12 text-primary" />
                <CardHeader className="p-0">
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-center text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </a>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}
