import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PackIndicator } from './PackIndicator';
import { CHANNELS, ORDER_STATUSES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Order, OrderStatus } from '@/lib/types';

export interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

/**
 * Modal que muestra el detalle completo de una orden
 * Incluye: info general, cliente, dirección, productos, totales, pago, cambio de estado
 *
 * @example
 * <OrderDetailModal
 *   order={selectedOrder}
 *   onClose={() => setSelectedOrder(null)}
 *   onStatusChange={handleStatusChange}
 * />
 */
export function OrderDetailModal({
  order,
  onClose,
  onStatusChange,
}: OrderDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  // Si no hay orden, no renderizar nada
  if (!order) return null;

  // Resetear estado seleccionado cuando cambia la orden
  if (selectedStatus === '') {
    setSelectedStatus(order.status);
  }

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== order.status) {
      onStatusChange(order.id, selectedStatus as OrderStatus);
      onClose();
    }
  };

  // Calcular subtotal de items
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.fullPrice * item.quantity,
    0
  );

  // Opciones para el select de estado
  const statusOptions = [
    { value: 'nuevo', label: ORDER_STATUSES.nuevo.label },
    { value: 'preparando', label: ORDER_STATUSES.preparando.label },
    { value: 'listo', label: ORDER_STATUSES.listo.label },
    { value: 'enviado', label: ORDER_STATUSES.enviado.label },
    { value: 'cancelado', label: ORDER_STATUSES.cancelado.label },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Detalle de Orden">
      <div className="space-y-6">
        {/* 1. INFORMACIÓN GENERAL */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Información General
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Canal</p>
              <div className="mt-1">
                <Badge color={CHANNELS[order.channel].color}>
                  {CHANNELS[order.channel].label}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">ID Externo</p>
              <p className="mt-1 font-mono font-semibold">{order.external_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fecha de Orden</p>
              <p className="mt-1 font-medium">
                {formatDate(order.order_date, 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            {order.closed_date && (
              <div>
                <p className="text-sm text-gray-600">Fecha de Cierre</p>
                <p className="mt-1 font-medium">
                  {formatDate(order.closed_date, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            )}
            {order.pack_id && (
              <div>
                <p className="text-sm text-gray-600">Pack ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono">{order.pack_id}</p>
                  <PackIndicator packId={order.pack_id} />
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Estado Actual</p>
              <div className="mt-1">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* 2. CLIENTE */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Cliente
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {order.customer.source === 'mercadolibre' ? (
              <>
                <div>
                  <p className="text-sm text-gray-600">Nickname</p>
                  <p className="mt-1 font-medium">{order.customer.nickname}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID</p>
                  <p className="mt-1 font-mono">{order.customer.id}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="mt-1 font-medium">{order.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="mt-1 font-medium">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                </div>
                {order.customer.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="mt-1 font-medium">{order.customer.phone}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* 3. DIRECCIÓN DE ENVÍO */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Dirección de Envío
          </h3>
          {order.shipping_address ? (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="font-medium">{order.shipping_address.street}</p>
              <p className="text-sm text-gray-600">
                {order.shipping_address.city}, {order.shipping_address.state}
              </p>
              <p className="text-sm text-gray-600">
                {order.shipping_address.country} - CP:{' '}
                {order.shipping_address.zipCode}
              </p>
              {order.shipping_address.receiverName && (
                <p className="text-sm text-gray-600 mt-3">
                  <span className="font-medium">Destinatario:</span>{' '}
                  {order.shipping_address.receiverName}
                </p>
              )}
              {order.shipping_address.receiverPhone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Teléfono:</span>{' '}
                  {order.shipping_address.receiverPhone}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Dirección de envío no disponible
            </p>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* 4. PRODUCTOS */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Productos ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Imagen del producto */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Info del producto */}
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>

                  {/* Variaciones */}
                  {item.variationAttributes &&
                    item.variationAttributes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.variationAttributes.map((attr, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded"
                          >
                            {attr.name}: {attr.value}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Precios y cantidad */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Cantidad: <span className="font-semibold">{item.quantity}</span>
                    </span>
                    <span className="text-gray-600">
                      Precio: <span className="font-semibold">{formatCurrency(item.unitPrice, item.currency)}</span>
                    </span>
                    <span className="text-gray-900 font-bold">
                      Total: {formatCurrency(item.fullPrice * item.quantity, item.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* 5. TOTALES */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Totales
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal items:</span>
              <span className="font-medium">
                {formatCurrency(itemsSubtotal, order.currency)}
              </span>
            </div>
            {order.paid_amount && order.paid_amount !== order.total_amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Monto pagado:</span>
                <span className="font-medium">
                  {formatCurrency(order.paid_amount, order.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(order.total_amount, order.currency)}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-right">
              Moneda: {order.currency}
            </p>
          </div>
        </section>

        {/* 6. INFORMACIÓN DE PAGO */}
        {order.payment_info && (
          <>
            <hr className="border-gray-200" />
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Información de Pago
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {order.payment_info.method && (
                  <div>
                    <p className="text-sm text-gray-600">Método</p>
                    <p className="mt-1 font-medium">{order.payment_info.method}</p>
                  </div>
                )}
                {order.payment_info.status && (
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="mt-1 font-medium">{order.payment_info.status}</p>
                  </div>
                )}
                {order.payment_info.installments && (
                  <div>
                    <p className="text-sm text-gray-600">Cuotas</p>
                    <p className="mt-1 font-medium">
                      {order.payment_info.installments}x
                    </p>
                  </div>
                )}
                {order.payment_info.paymentDate && (
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Pago</p>
                    <p className="mt-1 font-medium">
                      {formatDate(order.payment_info.paymentDate, 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <hr className="border-gray-200" />

        {/* 7. CAMBIAR ESTADO */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Cambiar Estado
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Select
                label="Nuevo Estado"
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value as OrderStatus)}
                options={statusOptions}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              disabled={selectedStatus === order.status || !selectedStatus}
            >
              Actualizar Estado
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
