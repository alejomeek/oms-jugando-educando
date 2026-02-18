import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import axios from 'axios';
// Mantener imports originales por si se necesitan
// import { fetchWixOrders, type WixConfig } from '@/services/wix';
// import { normalizeWixOrder } from '@/services/normalizer';

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

      // 2. Llamar a la Serverless Function (relativo: funciona en Vercel y local)
      const response = await axios.post('/api/sync-wix', {
        config,
        limit: 50,
        cursor: null,
      });

      if (!response.data.success) {
        throw new Error('Error al sincronizar con Wix');
      }

      const { orders: normalizedOrders, nextCursor, hasMore } = response.data;

      console.log(`Obtenidas ${normalizedOrders.length} órdenes de Wix`);

      if (normalizedOrders.length === 0) {
        return { inserted: 0, updated: 0, total: 0, hasMore: false };
      }

      // 3. Upsert en Supabase (insert o update si ya existe)
      const { error, count } = await supabase
        .from('orders')
        .upsert(normalizedOrders, {
          onConflict: 'channel,external_id',
          ignoreDuplicates: false, // Actualizar si ya existe
        });

      if (error) {
        console.error('Error upserting Wix orders:', error);
        throw new Error(`Error al guardar órdenes: ${error.message}`);
      }

      console.log(`Sincronización completada: ${count} órdenes procesadas`);

      return {
        inserted: count || 0,
        updated: 0, // Supabase no retorna cuántas fueron updates vs inserts
        total: normalizedOrders.length,
        hasMore: hasMore, // Indica si hay más páginas disponibles
        nextCursor,
      };
    },
    onSuccess: (data) => {
      console.log('Sincronización Wix exitosa:', data);
      // 4. Invalidar queries para refrescar la UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error en sincronización Wix:', error);
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        console.error('⚠️  No se pudo conectar a /api/sync-wix.');
      }
    },
  });
}
