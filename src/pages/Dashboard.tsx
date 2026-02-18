import { useState } from 'react';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useSyncML } from '@/hooks/useSyncML';
import { useSyncWix } from '@/hooks/useSyncWix';
import { Button } from '@/components/ui/Button';
import { OrderStats } from '@/components/orders/OrderStats';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import type { Order, OrderFilters as OrderFiltersType, OrderStatus } from '@/lib/types';

/**
 * Dashboard principal del OMS
 * Centraliza la gestión de pedidos de todos los canales e-commerce
 */
export function Dashboard() {
  // Estado local
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: null,
    channel: null,
  });

  // Hooks de datos
  const { data: orders = [], isLoading, error } = useOrders(filters);
  const { mutate: syncML, isPending: isSyncingML } = useSyncML();
  const { mutate: syncWix, isPending: isSyncingWix } = useSyncWix();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateOrderStatus();

  // Handlers
  const handleSyncML = () => {
    syncML();
  };

  const handleSyncWix = () => {
    syncWix();
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateStatus(
      { orderId, newStatus },
      {
        onSuccess: () => {
          console.log('Estado actualizado exitosamente');
        },
        onError: (error) => {
          console.error('Error al actualizar estado:', error);
          alert('Error al actualizar el estado. Por favor intenta nuevamente.');
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* HEADER */}
        <header className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                OMS - Gestión de Pedidos
              </h1>
              <p className="text-gray-600 mt-1">
                Didácticos Jugando y Educando
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                loading={isSyncingML}
                onClick={handleSyncML}
                disabled={isSyncingML}
              >
                Sincronizar Mercado Libre
              </Button>
              <Button
                variant="secondary"
                loading={isSyncingWix}
                onClick={handleSyncWix}
                disabled={isSyncingWix}
              >
                Sincronizar Wix
              </Button>
            </div>
          </div>
        </header>

        {/* Mensaje de error general */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error al cargar órdenes</p>
            <p className="text-red-600 text-sm mt-1">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        )}

        {/* STATS */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Estadísticas
          </h2>
          <OrderStats orders={orders} />
        </section>

        {/* FILTERS */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
          <OrderFilters filters={filters} onFiltersChange={setFilters} />
        </section>

        {/* TABLE */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Órdenes ({orders.length})
            </h2>
            {isUpdatingStatus && (
              <span className="text-sm text-blue-600 animate-pulse">
                Actualizando estado...
              </span>
            )}
          </div>
          <OrdersTable
            orders={orders}
            onOrderClick={handleOrderClick}
            isLoading={isLoading}
          />
        </section>

        {/* MODAL */}
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
