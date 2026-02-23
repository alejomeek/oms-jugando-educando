import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

interface MLConfig {
  accessToken: string;
  refreshToken: string;
  sellerId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Hook para sincronizar órdenes de Mercado Libre
 * Usa Vercel Serverless Function /api/sync-ml (en producción)
 * o el proxy de Vite (en desarrollo local)
 *
 * @returns Mutation de React Query con mutate, isPending, error
 *
 * @example
 * const { mutate: syncML, isPending } = useSyncML();
 *
 * // Sincronizar
 * syncML();
 */
export function useSyncML() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Obtener configuración de variables de entorno
      const config: MLConfig = {
        accessToken: import.meta.env.VITE_ML_ACCESS_TOKEN,
        refreshToken: import.meta.env.VITE_ML_REFRESH_TOKEN,
        sellerId: import.meta.env.VITE_ML_SELLER_ID,
        clientId: import.meta.env.VITE_ML_CLIENT_ID,
        clientSecret: import.meta.env.VITE_ML_CLIENT_SECRET,
      };

      // Validar que existan las variables de entorno
      if (
        !config.accessToken ||
        !config.refreshToken ||
        !config.sellerId ||
        !config.clientId ||
        !config.clientSecret
      ) {
        throw new Error(
          'Faltan variables de entorno de Mercado Libre. Verifica tu archivo .env.local'
        );
      }

      console.log('Iniciando sincronización de Mercado Libre...');

      // Consultar fecha del último pedido para sincronización incremental
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_date')
        .eq('channel', 'mercadolibre')
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
        console.log(`Sincronización incremental ML desde: ${dateFrom.split('T')[0]}`);
      }

      // 2. Llamar a la Serverless Function (relativo: funciona en Vercel y local)
      const response = await fetch('/api/sync-ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, limit: 50, offset: 0, dateFrom, dateTo }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP ${response.status} al sincronizar con Mercado Libre`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Error al sincronizar con Mercado Libre');
      }

      const { orders: normalizedOrders, newTokens } = data;

      console.log(`Obtenidas ${normalizedOrders.length} órdenes de Mercado Libre`);

      // Si hay nuevos tokens, mostrar advertencia para actualizarlos
      if (newTokens) {
        console.warn('⚠️  IMPORTANTE: Token de ML refrescado. Actualiza tu .env.local:');
        console.warn(`VITE_ML_ACCESS_TOKEN=${newTokens.accessToken}`);
        console.warn(`VITE_ML_REFRESH_TOKEN=${newTokens.refreshToken}`);
        console.warn(`Expira en: ${newTokens.expiresIn} segundos`);
      }

      if (normalizedOrders.length === 0) {
        return { inserted: 0, updated: 0, total: 0 };
      }

      // 3. FULL special case: identificar órdenes FULL activas sin remisión
      const TERMINAL = ['entregado', 'cancelado'];
      const fullActiveIds = normalizedOrders
        .filter((o: any) => o.logistic_type === 'fulfillment' && !TERMINAL.includes(o.status))
        .map((o: any) => o.order_id);

      let fullIdsToForce: string[] = [];

      if (fullActiveIds.length > 0) {
        const { data: fullWithRemision } = await supabase
          .from('orders')
          .select('order_id')
          .in('order_id', fullActiveIds)
          .not('remision_tbc', 'is', null);

        const withRemisionSet = new Set((fullWithRemision ?? []).map((o: any) => o.order_id));
        fullIdsToForce = fullActiveIds.filter((id: string) => !withRemisionSet.has(id));
      }

      // 4. Upsert en Supabase (insert o update si ya existe)
      const { error, count } = await supabase
        .from('orders')
        .upsert(normalizedOrders, {
          onConflict: 'channel,order_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error upserting ML orders:', error);
        throw new Error(`Error al guardar órdenes: ${error.message}`);
      }

      // 5. FULL sin remisión → forzar 'nuevo' con update explícito (el upsert no garantiza
      //    el cambio de status por RLS de INSERT vs UPDATE en Supabase)
      if (fullIdsToForce.length > 0) {
        const { error: fullError } = await supabase
          .from('orders')
          .update({ status: 'nuevo' })
          .in('order_id', fullIdsToForce)
          .eq('channel', 'mercadolibre');

        if (fullError) {
          console.error('Error forzando status FULL:', fullError);
        } else {
          console.log(`${fullIdsToForce.length} órdenes FULL forzadas a 'nuevo'`);
        }
      }

      console.log(`Sincronización completada: ${count} órdenes procesadas`);

      return {
        inserted: count || 0,
        updated: 0,
        total: normalizedOrders.length,
      };
    },
    onSuccess: (data) => {
      console.log('Sincronización ML exitosa:', data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-all'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error) => {
      console.error('Error en sincronización ML:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('⚠️  No se pudo conectar a /api/sync-ml.');
      }
    },
  });
}
