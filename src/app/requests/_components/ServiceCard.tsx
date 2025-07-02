import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Headphones, Wrench } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { toast } from 'sonner';

interface ServiceCardProps {
  icon: 'shopping' | 'support' | 'maintenance';
  title: string;
  description: string;
  href: string;
}

const icons = {
  shopping: <ShoppingCart className="w-10 h-10 text-primary mb-2" />,
  support: <Headphones className="w-10 h-10 text-primary mb-2" />,
  maintenance: <Wrench className="w-10 h-10 text-primary mb-2" />,
};

export function ServiceCard({ icon, title, description, href }: ServiceCardProps) {
  // Intercepta clique no card de suporte
  const handleClick = (e: React.MouseEvent) => {
    if (icon === 'support') {
      e.preventDefault();
      toast.warning('O módulo de Suporte de T.I. estará disponível em breve.', { position: 'top-center' });
    }
  };
  return (
    <Link href={href} className="block" onClick={handleClick} tabIndex={icon === 'support' ? -1 : 0} aria-disabled={icon === 'support'}>
      <Card className="flex flex-col items-center p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
        {icons[icon]}
        <CardContent className="p-0 text-center">
          <h2 className="font-semibold text-lg mb-1">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
} 