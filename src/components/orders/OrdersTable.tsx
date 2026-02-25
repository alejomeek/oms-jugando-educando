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
              ? (order.shipping_address?.receiverName || order.customer.nickname)
              : (`${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || order.customer.email);

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
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChannelBadge channel={order.channel} />
                  {order.channel === 'wix' && order.payment_info?.status === 'NOT_PAID' && (
                    <span className="rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      No Pagado
                    </span>
                  )}
                  {order.channel === 'wix' && order.payment_info?.status === 'PAID' && (
                    <span className="rounded border border-green-200 bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                      Pagado
                    </span>
                  )}
                  <LogisticTypeBadge logisticType={order.logistic_type} />
                  {order.store_name && order.channel !== 'falabella' && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {order.store_name}
                    </span>
                  )}
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
                <div className="flex flex-wrap items-center gap-1">
                  <OrderStatusBadge status={order.status} />
                  {order.channel === 'mercadolibre' && !order.remision_tbc && (
                    <span className="rounded bg-amber-100 px-1 py-px text-[9px] font-medium text-amber-700 leading-tight">
                      Sin rem.
                    </span>
                  )}
                </div>
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
