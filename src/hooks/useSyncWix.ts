import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

interface WixConfig {
  apiKey: string;
  siteId: string;
}

/**
 * Hook para sincronizar órdenes de Wix
 * Usa Vercel Serverless Function /api/sync-wix (en producción)
 * o el proxy de Vite (en desarrollo local)
 *
 * @returns Mutation de React Query con mutate, isPending, error
 *
 * @example
 * const { mutate: syncWix, isPending } = useSyncWix();
 *
 * // Sincronizar
 * syncWix();
 */
export function useSyncWix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Obtener configuración de variables de entorno
      const config: WixConfig = {
        apiKey: import.meta.env.VITE_WIX_API_KEY,
        siteId: import.meta.env.VITE_WIX_SITE_ID,
      };

      // Validar que existan las variables de entorno
      if (!config.apiKey || !config.siteId) {
        throw new Error(
          'Faltan variables de entorno de Wix. Verifica tu archivo .env.local'
        );
      }

      console.log('Iniciando sincronización de Wix...');

      // Consultar fecha del último pedido para sincronización incremental
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_date')
        .eq('channel', 'wix')
        .order('order_date', { ascending: false })
        .limit(1)
        .single();

      let dateFrom = undefined;
      let dateTo = undefined;

      if (lastOrder && lastOrder.order_date) {
        const lastDate = new Date(lastOrder.order_date);
        const fromDate = new Date(lastDate.getTime() - 2 * 24 * 60 * 60 * 1000); // Margen de 2 días
        dateFrom = fromDate.toISOString();
        dateTo = new Date().toISOString();
        console.log(`Sincronización incremental Wix desde: ${dateFrom.split('T')[0]}`);
      }

      // 2. Llamar a la Serverless Function (relativo: funciona en Vercel y local)
      const response = await fetch('/api/sync-wix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, limit: 50, cursor: null, dateFrom, dateTo }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP ${response.status} al sincronizar con Wix`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Error al sincronizar con Wix');
      }

      type WixNormalizedOrder = {
        order_id: string;
        status: string;
        [key: string]: unknown;
      };

      const { orders: normalizedOrders, nextCursor, hasMore } = data as {
        orders: WixNormalizedOrder[];
        nextCursor: string | null;
        hasMore: boolean;
      };

      console.log(`Obtenidas ${normalizedOrders.length} órdenes de Wix`);

      if (normalizedOrders.length === 0) {
        return { inserted: 0, updated: 0, total: 0, hasMore: false };
      }

      // 3. Preservar cambios manuales de status:
      //    Consultar los estados actuales de las órdenes que ya existen en la DB.
      //    El sync solo sobreescribe el status si Wix reporta un estado terminal
      //    (entregado / cancelado). De lo contrario se conserva el status manual.
      const incomingIds = normalizedOrders.map(o => o.order_id);
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('order_id, status')
        .eq('channel', 'wix')
        .in('order_id', incomingIds);

      const existingStatusMap = new Map(
        (existingOrders ?? []).map((o: { order_id: string; status: string | null }) => [o.order_id, o.status])
      );

      const TERMINAL_STATUSES = ['entregado', 'cancelado'];

      const ordersToUpsert = normalizedOrders.map(o => {
        const currentStatus = existingStatusMap.get(o.order_id);
        if (currentStatus && !TERMINAL_STATUSES.includes(o.status)) {
          // Orden ya existe y el nuevo status no es terminal → preservar manual
          return { ...o, status: currentStatus };
        }
        return o; // Orden nueva, o Wix dice entregado/cancelado → usar status de Wix
      });

      // 4. Upsert en Supabase (insert o update si ya existe)
      const { error, count } = await supabase
        .from('orders')
        .upsert(ordersToUpsert, {
          onConflict: 'channel,order_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error upserting Wix orders:', error);
        throw new Error(`Error al guardar órdenes: ${error.message}`);
      }

      console.log(`Sincronización completada: ${count} órdenes procesadas`);

      return {
        inserted: count || 0,
        updated: 0,
        total: normalizedOrders.length,
        hasMore,
        nextCursor,
      };
    },
    onSuccess: (data) => {
      console.log('Sincronización Wix exitosa:', data);
      // 4. Invalidar queries para refrescar la UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-all'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error) => {
      console.error('Error en sincronización Wix:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('⚠️  No se pudo conectar a /api/sync-wix.');
      }
    },
  });
}
