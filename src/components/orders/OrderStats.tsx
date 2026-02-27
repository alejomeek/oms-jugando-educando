import { ShoppingCart, Clock, Package, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { OrderStats as StatsType } from '@/lib/types';

export interface OrderStatsProps {
  stats: StatsType;
  isLoading?: boolean;
}

export function OrderStats({ stats, isLoading }: OrderStatsProps) {
  const statCards = [
    {
      label: 'Total pedidos',
      value: stats.total,
      icon: ShoppingCart,
    },
    {
      label: 'Nuevos',
      value: stats.nuevo,
      icon: Clock,
    },
    {
      label: 'Preparando',
      value: stats.preparando,
      icon: Package,
    },
    {
      label: 'Entregados',
      value: stats.entregado,
      icon: Truck,
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <stat.icon className="size-5 text-violet-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel breakdown */}
      <div className="flex items-center gap-5 text-base">
        <span className="text-muted-foreground">Por canal:</span>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-yellow-400" />
          <span className="font-medium">Mercado Libre</span>
          <span className="text-muted-foreground">({stats.mercadolibre})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-purple-500" />
          <span className="font-medium">Wix</span>
          <span className="text-muted-foreground">({stats.wix})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[rgb(170,214,62)]" />
          <span className="font-medium">Falabella</span>
          <span className="text-muted-foreground">({stats.falabella || 0})</span>
        </div>
      </div>
    </div>
  );
}
