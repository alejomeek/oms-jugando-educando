import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
    queryKey: ['orders', filters],
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

      if (filters?.store && filters.store.length > 0) {
        query = query.in('store_name', filters.store);
      }

      if (filters?.sinRemision) {
        query = query.eq('channel', 'mercadolibre').is('remision_tbc', null);
      }

      if (filters?.search) {
        query = query.or(
          `order_id.ilike.%${filters.search}%,pack_id.ilike.%${filters.search}%,customer->>nickname.ilike.%${filters.search}%,customer->>email.ilike.%${filters.search}%`
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

      // Complete partial packs: when searching, only the matching row comes back.
      // Fetch all sibling orders that share the same pack_id so packs are always shown complete.
      let fullData = data as Order[];
      const packIds = [
        ...new Set(
          fullData
            .filter(o => o.pack_id && o.channel === 'mercadolibre')
            .map(o => o.pack_id as string)
        ),
      ];
      if (packIds.length > 0) {
        const { data: siblings } = await supabase
          .from('orders')
          .select('*')
          .in('pack_id', packIds)
          .eq('channel', 'mercadolibre');
        if (siblings && siblings.length > 0) {
          const existingIds = new Set(fullData.map(o => o.id));
          const newSiblings = (siblings as Order[]).filter(s => !existingIds.has(s.id));
          fullData = [...fullData, ...newSiblings];
        }
      }

      // Group packs on the client side (within the current page)
      const groupedData = groupPackOrders(fullData);

      return {
        data: groupedData,
        count: count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    placeholderData: keepPreviousData, // Use new syntax for v5
  });
}

function groupPackOrders(orders: Order[]): Order[] {
  const result: Order[] = [];
  const packMap = new Map<string, Order>();

  for (const order of orders) {
    if (!order.pack_id || order.channel !== 'mercadolibre') {
      result.push(order);
      continue;
    }

    const existing = packMap.get(order.pack_id);
    if (!existing) {
      const packed: Order = {
        ...order,
        id: order.pack_id,
        order_id: order.pack_id,
        total_amount: order.total_amount,
        items: [...order.items],
        subOrders: [order],
      };
      packMap.set(order.pack_id, packed);
      result.push(packed);
    } else {
      existing.total_amount += order.total_amount;
      existing.items = [...existing.items, ...order.items];
      existing.subOrders = [...(existing.subOrders ?? []), order];
    }
  }

  return result;
}

interface UpdateStatusParams {
  orderId: string;
  newStatus: OrderStatus;
  notes?: string;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus, notes }: UpdateStatusParams) => {
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        throw new Error(`Error al obtener orden: ${fetchError.message}`);
      }

      const oldStatus = currentOrder.status;

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        throw new Error(`Error al actualizar orden: ${updateError.message}`);
      }

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: 'manual',
          notes: notes || null,
        });

      if (historyError) {
        throw new Error(`Error al registrar historial: ${historyError.message}`);
      }

      return { orderId, oldStatus, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
    },
  });
}
