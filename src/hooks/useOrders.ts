import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Order, OrderFilters, OrderStatus, PaginatedResponse } from '@/lib/types';

/**
 * Hook to fetch paginated orders from Supabase with filters.
 *
 * @param filters - Pagination and search filters
 * @returns React Query result with { data: Order[], count: number }
 */
export function useOrders(filters?: OrderFilters) {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', filters], // Key includes page/filters so it re-fetches on change
    queryFn: async () => {
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters?.search) {
        query = query.or(
          `order_id.ilike.%${filters.search}%,customer->>nickname.ilike.%${filters.search}%,customer->>email.ilike.%${filters.search}%`
        );
      }

      // Pagination & Sorting
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Note: Ordering by order_date DESC ensures newest first
      query = query
        .order('order_date', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        throw new Error(`Error al obtener órdenes: ${error.message}`);
      }

      // Group packs on the client side (within the current page)
      const groupedData = groupPackOrders(data as Order[]);

      return {
        data: groupedData,
        count: count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    keepPreviousData: true,   // Keep showing previous page while fetching next
  });
}

/**
 * Agrupa las órdenes de ML que comparten pack_id en una sola fila (dentro de la página actual).
 */
function groupPackOrders(orders: Order[]): Order[] {
  const result: Order[] = [];
  const packMap = new Map<string, Order>();

  for (const order of orders) {
    // Wix y ML sin pack_id → pasan directo
    if (!order.pack_id || order.channel !== 'mercadolibre') {
      result.push(order);
      continue;
    }

    const existing = packMap.get(order.pack_id);
    if (!existing) {
      // Primera orden del pack: crear entrada agrupada
      const packed: Order = {
        ...order,
        id: order.pack_id,           // clave única en React
        order_id: order.pack_id,     // lo que se muestra en la tabla
        total_amount: order.total_amount,
        items: [...order.items],
        subOrders: [order],
      };
      packMap.set(order.pack_id, packed);
      result.push(packed);
    } else {
      // Orden adicional del mismo pack: acumular
      existing.total_amount += order.total_amount;
      existing.items = [...existing.items, ...order.items];
      existing.subOrders = [...(existing.subOrders ?? []), order];
    }
  }

  return result;
}

/**
 * Parámetros para actualizar el estado de una orden
 */
interface UpdateStatusParams {
  orderId: string;
  newStatus: OrderStatus;
  notes?: string;
}

/**
 * Hook para actualizar el estado de una orden
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus, notes }: UpdateStatusParams) => {
      // 1. Obtener el estado actual de la orden
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        throw new Error(`Error al obtener orden: ${fetchError.message}`);
      }

      const oldStatus = currentOrder.status;

      // 2. Actualizar el estado de la orden
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        throw new Error(`Error al actualizar orden: ${updateError.message}`);
      }

      // 3. Insertar registro en historial
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: 'manual', // En MVP siempre manual
          notes: notes || null,
        });

      if (historyError) {
        throw new Error(`Error al registrar historial: ${historyError.message}`);
      }

      return { orderId, oldStatus, newStatus };
    },
    onSuccess: () => {
      // Invalidar query de 'orders' (y 'order-stats' si existiera caché allí)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
    },
  });
}
