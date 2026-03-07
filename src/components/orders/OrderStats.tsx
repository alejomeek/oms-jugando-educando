import type { OrderStats as StatsType } from '@/lib/types';
import type { Sede } from '@/hooks/useOperatorOrders';

export interface OrderStatsProps {
  stats: StatsType;
  isLoading?: boolean;
  sede?: Sede;
}

export function OrderStats({ stats, isLoading, sede }: OrderStatsProps) {
  if (isLoading) {
    return <div className="animate-pulse h-16 bg-gray-100 rounded-lg" />;
  }

  const showWixFalabella = !sede || sede === 'bulevar';

  return (
    <div className="flex flex-col gap-3">
      {/* Channel breakdown */}
      <div className="flex items-center gap-5 text-base">
        <span className="text-muted-foreground">Por canal:</span>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-yellow-400" />
          <span className="font-medium">Mercado Libre</span>
          <span className="text-muted-foreground">({stats.mercadolibre})</span>
        </div>
        {showWixFalabella && (
          <>
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
          </>
        )}
      </div>

      {/* Total pedidos — parte inferior */}
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        <span>Total pedidos:</span>
        <span className="font-semibold text-gray-800">{stats.total}</span>
      </div>
    </div>
  );
}
