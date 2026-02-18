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

      // 2. Llamar a la Serverless Function (relativo: funciona en Vercel y local)
      const response = await fetch('/api/sync-ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, limit: 50, offset: 0 }),
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

      // 3. Upsert en Supabase (insert o update si ya existe)
      const { error, count } = await supabase
        .from('orders')
        .upsert(normalizedOrders, {
          onConflict: 'channel,order_id',
          ignoreDuplicates: false, // Actualizar si ya existe
        });

      if (error) {
        console.error('Error upserting ML orders:', error);
        throw new Error(`Error al guardar órdenes: ${error.message}`);
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
      // 4. Invalidar queries para refrescar la UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error en sincronización ML:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('⚠️  No se pudo conectar a /api/sync-ml.');
      }
    },
  });
}
