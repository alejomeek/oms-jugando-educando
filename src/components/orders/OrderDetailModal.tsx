import { useState, useEffect } from 'react';
import { ImageOff, Download, ArrowRightLeft, CheckCircle2, FileText, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
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
import { useAssignRemision } from '@/hooks/useAssignRemision';
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
  const [migratingToHalcon, setMigratingToHalcon] = useState(false);
  const [halconSerial, setHalconSerial] = useState<number | null>(order?.halcon_serial ?? null);

  // Remisión TBC
  const [remisionAssigned, setRemisionAssigned] = useState<{ remision: string; fecha: string } | null>(
    order?.remision_tbc ? { remision: order.remision_tbc, fecha: order.fecha_remision_tbc ?? '' } : null,
  );
  const [remisionInput, setRemisionInput] = useState('');
  const [fechaInput, setFechaInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [editingRemision, setEditingRemision] = useState(false);
  const [markingReadyToShip, setMarkingReadyToShip] = useState(false);
  const assignRemision = useAssignRemision();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setHalconSerial(order.halcon_serial ?? null);
      if (order.remision_tbc) {
        setRemisionAssigned({ remision: order.remision_tbc, fecha: order.fecha_remision_tbc ?? '' });
        setRemisionInput(order.remision_tbc);
        setFechaInput(order.fecha_remision_tbc ?? new Date().toISOString().split('T')[0]);
      } else {
        setRemisionAssigned(null);
        setRemisionInput('');
        setFechaInput(new Date().toISOString().split('T')[0]);
      }
      setEditingRemision(false);
    }
  }, [order]);

  if (!order) return null;

  const falabellaOrderItemIds = order.channel === 'falabella'
    ? order.items.map(i => i.orderItemId).filter(Boolean).join(',')
    : null;
  const falabellaLabelUrl = falabellaOrderItemIds
    ? `/api/falabella-label?order_item_ids=${falabellaOrderItemIds}`
    : null;

  const isPack = (order.subOrders?.length ?? 0) > 1;
  const displayId = order.pack_id ?? order.order_id ?? (order as any).external_id;

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setSelectedStatus(newStatus);
    if (isPack && order.subOrders) {
      order.subOrders.forEach(sub => onStatusChange(sub.id, newStatus));
    } else {
      onStatusChange(order.id, newStatus);
    }
  };

  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.fullPrice * item.quantity,
    0
  );

  const shippingCost = order.payment_info?.shipping_cost ?? 0;

  const mlLabelUrl = order.channel === 'mercadolibre' && order.shipping_id
    ? `/api/download-ml-label?shipment_id=${order.shipping_id}`
    : null;

  const isHalconEligible =
    order.channel === 'wix' ||
    (order.channel === 'mercadolibre' && order.logistic_type === 'self_service');

  const handleMigrateToHalcon = async () => {
    setMigratingToHalcon(true);
    try {
      const res = await fetch('/api/push-to-halcon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al migrar');

      // Guardar serial en Supabase para prevenir duplicados futuros
      const targetId = order.subOrders?.[0]?.id ?? order.id;
      await supabase
        .from('orders')
        .update({ halcon_serial: data.numero_serial })
        .eq('id', targetId);

      // Actualizar UI inmediatamente y refrescar cache
      setHalconSerial(data.numero_serial);
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success(`Pedido #${data.numero_serial} creado en Halcon`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al migrar a Halcon');
    } finally {
      setMigratingToHalcon(false);
    }
  };

  const handleMarkReadyToShip = async () => {
    setMarkingReadyToShip(true);
    try {
      const orderItemIds = order.items
        .map(i => i.orderItemId)
        .filter(Boolean)
        .map(Number);
      const packageId = order.items.find(i => i.packageId)?.packageId;

      if (!orderItemIds.length || !packageId) {
        throw new Error('Faltan OrderItemIds o PackageId. Re-sincroniza la orden.');
      }

      const res = await fetch('/api/falabella-ready-to-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemIds, packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al marcar');

      onStatusChange(order.id, 'preparando');
      toast.success('Orden marcada como lista para envío');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar como listo para envío');
    } finally {
      setMarkingReadyToShip(false);
    }
  };

  const handleSaveRemision = () => {
    if (!remisionInput.trim()) {
      toast.error('Ingresa un número de remisión');
      return;
    }
    assignRemision.mutate(
      { order, remision: remisionInput.trim(), fecha: fechaInput },
      {
        onSuccess: () => {
          setRemisionAssigned({ remision: remisionInput.trim(), fecha: fechaInput });
          setEditingRemision(false);
        },
      },
    );
  };

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg">
              {isPack ? 'Pack' : 'Pedido'} #{displayId}
            </SheetTitle>
            <ChannelBadge channel={order.channel} />
            <LogisticTypeBadge logisticType={order.logistic_type} />
            {order.store_name && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {order.store_name}
              </span>
            )}
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
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío:</span>
                  <span className="font-medium">{formatCurrency(shippingCost, order.currency)}</span>
                </div>
              )}
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
              {order.channel === 'falabella' && order.payment_info?.promised_shipping_time && (
                <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
                  <p className="font-medium text-orange-800">Fecha límite envío:</p>
                  <p className="text-orange-700">
                    {formatDate(order.payment_info.promised_shipping_time, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              )}
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
          <div className="flex flex-wrap gap-2">
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
            {isHalconEligible && (
              halconSerial != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
                  <CheckCircle2 className="size-3.5" />
                  En Halcon #{halconSerial}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={migratingToHalcon}
                  onClick={() => void handleMigrateToHalcon()}
                >
                  <ArrowRightLeft className="size-4 mr-2" />
                  {migratingToHalcon ? 'Migrando...' : 'Migrar a Halcon'}
                </Button>
              )
            )}
            {falabellaLabelUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={falabellaLabelUrl} download>
                  <Download className="size-4 mr-2" />
                  Descargar Etiqueta Falabella
                </a>
              </Button>
            )}
            {order.channel === 'falabella' &&
             order.logistic_type === 'dropshipping' &&
             order.status === 'nuevo' && (
              <Button
                variant="outline"
                size="sm"
                disabled={markingReadyToShip}
                onClick={() => void handleMarkReadyToShip()}
              >
                <CheckCircle2 className="size-4 mr-2" />
                {markingReadyToShip ? 'Marcando...' : 'Listo para Envío'}
              </Button>
            )}
          </div>

          <Separator />

          {/* Change status */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estado{isPack ? ' (todas las órdenes del pack)' : ''}
            </h3>
            <Select
              value={selectedStatus}
              onValueChange={(v) => handleStatusChange(v as OrderStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="preparando">Preparando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </section>

          {/* Remisión TBC — solo órdenes ML */}
          {order.channel === 'mercadolibre' && (
            <>
              <Separator />
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Remisión TBC
                </h3>

                {remisionAssigned && !editingRemision ? (
                  /* Remisión ya asignada */
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          #{remisionAssigned.remision}
                        </p>
                        {remisionAssigned.fecha && (
                          <p className="text-xs text-green-600">
                            {formatDate(remisionAssigned.fecha, 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemisionInput(remisionAssigned.remision);
                        setFechaInput(remisionAssigned.fecha || new Date().toISOString().split('T')[0]);
                        setEditingRemision(true);
                      }}
                    >
                      <Pencil className="size-3.5 mr-1" />
                      Editar
                    </Button>
                  </div>
                ) : (
                  /* Formulario de asignación */
                  <div className="space-y-3">
                    {isPack && (
                      <p className="text-xs text-muted-foreground">
                        Se aplicará a las {order.subOrders!.length} órdenes del pack
                      </p>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-muted-foreground">Número</label>
                        <input
                          type="text"
                          value={remisionInput}
                          onChange={e => setRemisionInput(e.target.value)}
                          placeholder="Ej: 12345"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
                        <input
                          type="date"
                          value={fechaInput}
                          onChange={e => setFechaInput(e.target.value)}
                          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={assignRemision.isPending || !remisionInput.trim()}
                        onClick={handleSaveRemision}
                      >
                        {assignRemision.isPending ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                    {editingRemision && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRemision(false);
                          if (remisionAssigned) {
                            setRemisionInput(remisionAssigned.remision);
                            setFechaInput(remisionAssigned.fecha);
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
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
