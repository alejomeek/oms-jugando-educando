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
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Nuevos',
      value: stats.nuevo,
      icon: Clock,
      iconBg: 'bg-sky-100 text-sky-600',
    },
    {
      label: 'Preparando',
      value: stats.preparando,
      icon: Package,
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Entregados',
      value: stats.entregado,
      icon: Truck,
      iconBg: 'bg-green-100 text-green-600',
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="py-4">
            <CardContent className="flex items-center gap-4">
              <div className={`flex size-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">Hoy</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel breakdown */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Por canal:</span>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="font-medium">Mercado Libre</span>
          <span className="text-muted-foreground">({stats.mercadolibre})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-purple-500" />
          <span className="font-medium">Wix</span>
          <span className="text-muted-foreground">({stats.wix})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[rgb(170,214,62)]" />
          <span className="font-medium">Falabella</span>
          <span className="text-muted-foreground">({stats.falabella || 0})</span>
        </div>
      </div>
    </div>
  );
}
