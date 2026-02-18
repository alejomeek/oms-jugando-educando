import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Order, OrderFilters, OrderStatus } from '@/lib/types';

/**
 * Hook para obtener órdenes de Supabase con filtros
 *
 * @param filters - Filtros opcionales (status, channel, search)
 * @returns Query de React Query con data, isLoading, error
 *
 * @example
 * const { data: orders, isLoading } = useOrders({ status: 'nuevo', channel: 'mercadolibre' });
 */
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false });

      // Aplicar filtro de status
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Aplicar filtro de channel
      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }

      // Aplicar búsqueda por external_id o datos del customer
      if (filters?.search) {
        query = query.or(
          `external_id.ilike.%${filters.search}%,customer->>nickname.ilike.%${filters.search}%,customer->>email.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        throw new Error(`Error al obtener órdenes: ${error.message}`);
      }

      return data as Order[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
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
 * Actualiza la orden Y registra el cambio en order_status_history
 *
 * @returns Mutation de React Query con mutate, isPending, error
 *
 * @example
 * const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
 * updateStatus({
 *   orderId: 'uuid',
 *   newStatus: 'preparando',
 *   notes: 'Comenzando preparación'
 * });
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
      // Invalidar todas las queries de orders para refrescar la UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
    },
  });
}
