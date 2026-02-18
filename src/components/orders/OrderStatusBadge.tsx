import { Badge } from '@/components/ui/Badge';
import { ORDER_STATUSES } from '@/lib/constants';
import type { OrderStatus } from '@/lib/types';

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

/**
 * Badge que muestra el estado de una orden con color correspondiente
 *
 * @example
 * <OrderStatusBadge status="nuevo" />
 * <OrderStatusBadge status="preparando" />
 */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusInfo = ORDER_STATUSES[status];

  return (
    <Badge color={statusInfo.color}>
      {statusInfo.label}
    </Badge>
  );
}
