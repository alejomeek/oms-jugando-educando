import type { Order } from '@/lib/types';

export interface OrderStatsProps {
  orders: Order[];
}

/**
 * Muestra estadísticas de órdenes agrupadas por estado
 * Calcula contadores de: nuevo, preparando, listo, enviado, total
 *
 * @example
 * <OrderStats orders={orders} />
 */
export function OrderStats({ orders }: OrderStatsProps) {
  // Calcular contadores por estado
  const stats = {
    nuevo: orders.filter((o) => o.status === 'nuevo').length,
    preparando: orders.filter((o) => o.status === 'preparando').length,
    listo: orders.filter((o) => o.status === 'listo').length,
    enviado: orders.filter((o) => o.status === 'enviado').length,
    total: orders.length,
  };

  const statCards = [
    { key: 'nuevo', label: 'Nuevos', value: stats.nuevo, color: 'blue' },
    { key: 'preparando', label: 'Preparando', value: stats.preparando, color: 'yellow' },
    { key: 'listo', label: 'Listos', value: stats.listo, color: 'green' },
    { key: 'enviado', label: 'Enviados', value: stats.enviado, color: 'gray' },
    { key: 'total', label: 'Total', value: stats.total, color: 'purple' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.key}
          className={`p-4 border-2 rounded-lg ${colorClasses[stat.color]}`}
        >
          <div className="text-sm font-medium opacity-75">{stat.label}</div>
          <div className="text-3xl font-bold mt-1">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
