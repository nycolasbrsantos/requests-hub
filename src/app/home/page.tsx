"use client";
import { PageContainer } from '@/components/ui/page-container';
import { ServiceCard } from '../requests/_components/ServiceCard';
import { useSession } from 'next-auth/react';

export default function ProtectedHomePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === 'admin';
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold mb-2 text-center">Bem-vindo(a) ao Portal de Serviços</h1>
        {session?.user?.name && (
          <p className="text-lg font-medium text-center mb-1">Olá, {session.user.name}!</p>
        )}
        <p className="text-muted-foreground mb-8 text-center">Selecione o serviço que deseja solicitar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
          <ServiceCard
            icon="shopping"
            title="Requisição de Compras"
            description="Solicite materiais, equipamentos e outros itens."
            href="/requests/add?type=purchase"
          />
          <ServiceCard
            icon="support"
            title="Suporte de T.I."
            description="Abra um chamado para problemas técnicos e suporte."
            href="/requests/add?type=support"
          />
          <ServiceCard
            icon="maintenance"
            title="Manutenção Predial"
            description="Peça reparos ou informe sobre problemas na infraestrutura."
            href="/requests/add?type=maintenance"
          />
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <a href="/requests" className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">Painel de Requisições</a>
          {isAdmin && (
            <a href="/admin/users" className="inline-block px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Painel Admin</a>
          )}
        </div>
      </div>
    </PageContainer>
  );
} 