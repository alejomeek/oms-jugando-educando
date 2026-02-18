import { Badge } from '@/components/ui/Badge';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PackIndicator } from './PackIndicator';
import { CHANNELS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Order } from '@/lib/types';

export interface OrderRowProps {
  order: Order;
  onClick: (order: Order) => void;
}

/**
 * Fila de tabla que muestra información resumida de una orden
 * Incluye: canal, ID externo, cliente, fecha, total, estado, indicador de pack
 *
 * @example
 * <OrderRow order={order} onClick={handleOrderClick} />
 */
export function OrderRow({ order, onClick }: OrderRowProps) {
  // Obtener nombre del cliente según el canal
  const customerName =
    order.customer.source === 'mercadolibre'
      ? order.customer.nickname
      : order.customer.email || `${order.customer.firstName} ${order.customer.lastName}`;

  return (
    <tr
      onClick={() => onClick(order)}
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* Canal */}
      <td className="px-4 py-3">
        <Badge color={CHANNELS[order.channel].color}>
          {CHANNELS[order.channel].label}
        </Badge>
      </td>

      {/* ID Externo */}
      <td className="px-4 py-3 font-mono text-sm">{order.external_id}</td>

      {/* Cliente */}
      <td className="px-4 py-3 max-w-xs truncate">{customerName}</td>

      {/* Fecha */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {formatDate(order.order_date, 'dd/MM/yyyy HH:mm')}
      </td>

      {/* Total */}
      <td className="px-4 py-3 font-semibold">
        {formatCurrency(order.total_amount, order.currency)}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <OrderStatusBadge status={order.status} />
      </td>

      {/* Pack Indicator */}
      <td className="px-4 py-3">
        <PackIndicator packId={order.pack_id} />
      </td>
    </tr>
  );
}
