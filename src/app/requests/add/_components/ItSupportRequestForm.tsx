"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ItSupportRequestForm() {
  return (
    <Card className="max-w-xl mx-auto shadow-lg border-primary/20 mt-8">
      <CardHeader>
        <CardTitle>Suporte de T.I.</CardTitle>
        <CardDescription>Abra um chamado para problemas técnicos e suporte.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-6 text-center text-yellow-800 bg-yellow-100 border border-yellow-300 rounded">
          O módulo de Suporte de T.I. estará disponível em breve.<br />
          Caso precise de suporte urgente, entre em contato com o setor de T.I. diretamente.
        </div>
      </CardContent>
    </Card>
  );
} 