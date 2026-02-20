import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  nuevo: {
    label: 'Nuevo',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  preparando: {
    label: 'Preparando',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  enviado: {
    label: 'Enviado',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  entregado: {
    label: 'Entregado',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
