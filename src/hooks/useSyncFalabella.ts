import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export function useSyncFalabella() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const config = {
        userId: import.meta.env.VITE_FALABELLA_USER_ID as string,
        apiKey: import.meta.env.VITE_FALABELLA_API_KEY as string,
      };

      if (!config.userId || !config.apiKey) {
        throw new Error(
          'Faltan variables de entorno de Falabella. Verifica VITE_FALABELLA_USER_ID y VITE_FALABELLA_API_KEY en .env.local'
        );
      }

      console.log('Iniciando sincronización de Falabella...');

      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_date')
        .eq('channel', 'falabella')
        .order('order_date', { ascending: false })
        .limit(1)
        .single();

      let dateFrom: string | undefined = undefined;

      if (lastOrder?.order_date) {
        const lastDate = new Date(lastOrder.order_date);
        const fromDate = new Date(lastDate.getTime() - 2 * 24 * 60 * 60 * 1000);
        dateFrom = fromDate.toISOString();
        console.log(`Sincronización incremental Falabella desde: ${dateFrom.split('T')[0]}`);
      }

      const response = await fetch('/api/sync-falabella', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dateFrom }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
          `Error HTTP ${response.status} al sincronizar con Falabella`
        );
      }

      const data = await response.json() as { success: boolean; orders: unknown[]; total: number };

      if (!data.success) {
        throw new Error('Error al sincronizar con Falabella');
      }

      const { orders: normalizedOrders } = data;

      console.log(`Obtenidas ${normalizedOrders.length} órdenes de Falabella`);

      if (normalizedOrders.length === 0) {
        return { total: 0 };
      }

      const { error } = await supabase
        .from('orders')
        .upsert(normalizedOrders, {
          onConflict: 'channel,order_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error upserting Falabella orders:', error);
        throw new Error(`Error al guardar órdenes: ${error.message}`);
      }

      console.log(`Sincronización Falabella completada: ${normalizedOrders.length} órdenes`);

      return { total: normalizedOrders.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-all'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error) => {
      console.error('Error en sincronización Falabella:', error);
    },
  });
}
