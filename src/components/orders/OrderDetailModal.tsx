import { useState, useEffect } from 'react';
import { ImageOff, Download } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ChannelBadge } from './ChannelBadge';
import { LogisticTypeBadge } from './LogisticTypeBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { printWixLabel } from '@/services/labelPrinter';
import type { Order, OrderStatus } from '@/lib/types';

export interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailModal({
  order,
  onClose,
  onStatusChange,
}: OrderDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
    }
  }, [order]);

  if (!order) return null;

  const isPack = (order.subOrders?.length ?? 0) > 1;
  const displayId = order.pack_id ?? order.order_id ?? (order as any).external_id;

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== order.status) {
      // Si es pack, actualizar todas las sub-órdenes
      if (isPack && order.subOrders) {
        order.subOrders.forEach(sub => onStatusChange(sub.id, selectedStatus as OrderStatus));
      } else {
        onStatusChange(order.id, selectedStatus as OrderStatus);
      }
      onClose();
    }
  };

  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.fullPrice * item.quantity,
    0
  );

  const mlLabelUrl = order.channel === 'mercadolibre' && order.shipping_id
    ? `/api/download-ml-label?shipment_id=${order.shipping_id}`
    : null;

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-lg">
              {isPack ? 'Pack' : 'Pedido'} #{displayId}
            </SheetTitle>
            <ChannelBadge channel={order.channel} />
            <LogisticTypeBadge logisticType={order.logistic_type} />
            {isPack && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {order.subOrders!.length} órdenes
              </span>
            )}
          </div>
          <SheetDescription>
            {formatDate(order.order_date, "dd 'de' MMMM yyyy, HH:mm")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Status */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Estado actual</p>
              <div className="mt-1">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer info */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cliente
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {order.customer.source === 'mercadolibre' ? (
                <>
                  <InfoField label="Nickname" value={order.customer.nickname} />
                  <InfoField label="ID" value={order.customer.id} mono />
                </>
              ) : (
                <>
                  <InfoField label="Email" value={order.customer.email} />
                  <InfoField
                    label="Nombre"
                    value={`${order.customer.firstName} ${order.customer.lastName}`}
                  />
                  {order.customer.phone && (
                    <InfoField label="Telefono" value={order.customer.phone} />
                  )}
                </>
              )}
            </div>
          </section>

          <Separator />

          {/* Shipping address */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direccion de envio
            </h3>
            {order.shipping_address ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">{order.shipping_address.street}</p>
                <p className="text-muted-foreground">
                  {order.shipping_address.city}, {order.shipping_address.state}
                </p>
                <p className="text-muted-foreground">
                  {order.shipping_address.country} - CP: {order.shipping_address.zipCode}
                </p>
                {order.shipping_address.receiverName && (
                  <p className="mt-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Destinatario:</span>{' '}
                    {order.shipping_address.receiverName}
                  </p>
                )}
                {order.shipping_address.receiverPhone && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Tel:</span>{' '}
                    {order.shipping_address.receiverPhone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Direccion de envio no disponible
              </p>
            )}
          </section>

          <Separator />

          {/* Products — pack view (sub-orders) or normal */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Productos ({order.items.length})
            </h3>

            {isPack ? (
              // Pack: mostrar cada sub-orden como sección
              <div className="space-y-4">
                {order.subOrders!.map((sub) => (
                  <div key={sub.id} className="rounded-lg border overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Orden #{sub.order_id ?? (sub as any).external_id}
                      </span>
                      <span className="text-xs font-semibold">
                        {formatCurrency(sub.total_amount, sub.currency)}
                      </span>
                    </div>
                    <div className="divide-y">
                      {sub.items.map((item, i) => (
                        <ProductRow key={i} item={item} currency={sub.currency} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Orden normal
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <ProductRow key={index} item={item} currency={order.currency} />
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Totals */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Totales
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal items:</span>
                <span className="font-medium">{formatCurrency(itemsSubtotal, order.currency)}</span>
              </div>
              {!isPack && order.paid_amount && order.paid_amount !== order.total_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto pagado:</span>
                  <span className="font-medium">{formatCurrency(order.paid_amount, order.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between pt-1">
                <span className="text-base font-semibold">Total{isPack ? ' pack' : ''}:</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(order.total_amount, order.currency)}
                </span>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                Moneda: {order.currency}
              </p>
            </div>
          </section>

          {/* Payment info */}
          {order.payment_info && (
            <>
              <Separator />
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Informacion de pago
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {order.payment_info.method && (
                    <InfoField label="Metodo" value={order.payment_info.method} />
                  )}
                  {order.payment_info.status && (
                    <InfoField label="Estado" value={order.payment_info.status} />
                  )}
                  {order.payment_info.installments && (
                    <InfoField label="Cuotas" value={`${order.payment_info.installments}x`} />
                  )}
                  {order.payment_info.paymentDate && (
                    <InfoField
                      label="Fecha de pago"
                      value={formatDate(order.payment_info.paymentDate, 'dd/MM/yyyy HH:mm')}
                    />
                  )}
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {mlLabelUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={mlLabelUrl} download>
                  <Download className="size-4 mr-2" />
                  Descargar Etiqueta ML
                </a>
              </Button>
            )}
            {order.channel === 'wix' && (
              <Button variant="outline" size="sm" onClick={() => void printWixLabel(order)}>
                <Download className="size-4 mr-2" />
                Generar Etiqueta PDF
              </Button>
            )}
          </div>

          <Separator />

          {/* Change status */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cambiar estado{isPack ? ' (todas las órdenes del pack)' : ''}
            </h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as OrderStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="preparando">Preparando</SelectItem>
                    <SelectItem value="listo">Listo</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={selectedStatus === order.status || !selectedStatus}
              >
                Actualizar
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProductRow({ item, currency }: { item: Order['items'][0]; currency: string }) {
  return (
    <div className="flex gap-3 p-3">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="size-16 rounded-md object-cover"
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-md bg-muted">
          <ImageOff className="size-6 text-muted-foreground/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-sm">{item.title}</p>
        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
        {item.variationAttributes && item.variationAttributes.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.variationAttributes.map((attr, i) => (
              <span
                key={i}
                className="rounded border bg-muted/50 px-1.5 py-0.5 text-xs"
              >
                {attr.name}: {attr.value}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Cant: <span className="font-semibold text-foreground">{item.quantity}</span>
          </span>
          <span className="text-muted-foreground">
            Precio: <span className="font-semibold text-foreground">{formatCurrency(item.unitPrice, currency)}</span>
          </span>
          <span className="font-bold">
            {formatCurrency(item.fullPrice * item.quantity, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}
