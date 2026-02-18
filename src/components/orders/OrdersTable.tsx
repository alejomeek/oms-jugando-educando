import { Spinner } from '@/components/ui/Spinner';
import { OrderRow } from './OrderRow';
import type { Order } from '@/lib/types';

export interface OrdersTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  isLoading?: boolean;
}

/**
 * Tabla responsiva de órdenes con loading y empty states
 * Usa OrderRow para renderizar cada orden
 *
 * @example
 * <OrdersTable
 *   orders={orders}
 *   onOrderClick={handleOrderClick}
 *   isLoading={isLoading}
 * />
 */
export function OrdersTable({
  orders,
  onOrderClick,
  isLoading = false,
}: OrdersTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando órdenes...</span>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg font-medium">No se encontraron órdenes</p>
        <p className="text-sm mt-1">
          Intenta ajustar los filtros o sincroniza órdenes desde los canales
        </p>
      </div>
    );
  }

  // Table
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Canal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID Orden
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pack
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onClick={onOrderClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
