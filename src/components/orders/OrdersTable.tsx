import { Eye, PackageSearch } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ChannelBadge } from './ChannelBadge';
import { LogisticTypeBadge } from './LogisticTypeBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Order } from '@/lib/types';

export interface OrdersTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function OrdersTable({
  orders,
  onOrderClick,
  isLoading = false,
}: OrdersTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <PackageSearch className="mb-3 size-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">No se encontraron pedidos</p>
        <p className="mt-1 text-sm">
          Intenta ajustar los filtros o sincroniza pedidos desde los canales
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Canal</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-center">Items</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const customerName =
            order.customer.source === 'mercadolibre'
              ? order.customer.nickname
              : order.customer.email ||
              `${order.customer.firstName} ${order.customer.lastName}`;

          return (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => onOrderClick(order)}
            >
              <TableCell className="font-mono text-xs">
                {order.channel === 'mercadolibre'
                  ? (order.pack_id ?? order.order_id ?? (order as any).external_id)
                  : (order.order_id ?? (order as any).external_id)}
              </TableCell>
              <TableCell className="max-w-[180px] truncate font-medium">
                {customerName}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <ChannelBadge channel={order.channel} />
                  <LogisticTypeBadge logisticType={order.logistic_type} />
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(order.order_date, 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="text-center">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(order.total_amount, order.currency)}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrderClick(order);
                  }}
                >
                  <Eye className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
