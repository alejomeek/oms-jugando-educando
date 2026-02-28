/**
 * Auto-sync implementation decision:
 * We use frontend polling (setInterval) rather than a Vercel cron job because:
 * 1. The app is single-user (business owner), so server-side polling has no advantage
 * 2. Vercel cron requires Pro plan and adds infrastructure complexity
 * 3. Frontend polling is simpler, configurable at runtime, and stops when tab is closed
 *
 * Architecture: This hook manages a configurable interval that calls the sync endpoints.
 * It also tracks the order count before each sync to detect new orders for notifications.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export interface AutoSyncConfig {
  intervalMinutes: number;
  enabled: boolean;
  onSyncStart?: (channel: 'mercadolibre' | 'wix' | 'falabella') => void;
  onSyncComplete?: (channel: 'mercadolibre' | 'wix' | 'falabella', newOrderCount: number) => void;
  onSyncError?: (channel: 'mercadolibre' | 'wix' | 'falabella', error: Error) => void;
}

export function useAutoSync(config: AutoSyncConfig) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const performSync = useCallback(async () => {
    const { onSyncStart, onSyncComplete, onSyncError } = configRef.current;

    // Build configs from env vars (same pattern as useSyncML / useSyncWix)
    const mlConfig = {
      accessToken: import.meta.env.VITE_ML_ACCESS_TOKEN,
      refreshToken: import.meta.env.VITE_ML_REFRESH_TOKEN,
      sellerId: import.meta.env.VITE_ML_SELLER_ID,
      clientId: import.meta.env.VITE_ML_CLIENT_ID,
      clientSecret: import.meta.env.VITE_ML_CLIENT_SECRET,
    };
    const wixConfig = {
      apiKey: import.meta.env.VITE_WIX_API_KEY,
      siteId: import.meta.env.VITE_WIX_SITE_ID,
    };
    const falabellaConfig = {
      userId: import.meta.env.VITE_FALABELLA_USER_ID,
      apiKey: import.meta.env.VITE_FALABELLA_API_KEY,
    };

    const channels: Array<{
      channel: 'mercadolibre' | 'wix' | 'falabella';
      endpoint: string;
      body: Record<string, unknown>;
    }> = [
      { channel: 'mercadolibre', endpoint: '/api/sync-ml', body: { config: mlConfig, limit: 50, offset: 0 } },
      { channel: 'wix', endpoint: '/api/sync-wix', body: { config: wixConfig, limit: 50, cursor: null } },
      { channel: 'falabella', endpoint: '/api/sync-falabella', body: { config: falabellaConfig } },
    ];

    // countBefore se actualiza canal por canal para evitar conteo acumulado incorrecto
    let countBefore = (() => {
      const d = queryClient.getQueryData<unknown[]>(['orders']);
      return Array.isArray(d) ? d.length : 0;
    })();

    for (const { channel, endpoint, body } of channels) {
      try {
        // dateFrom incremental para Falabella: se calcula dentro del try/catch
        // para que un fallo de Supabase no rompa la sincronización de los otros canales
        if (channel === 'falabella') {
          const { data: lastFalabellaOrder } = await supabase
            .from('orders')
            .select('order_date')
            .eq('channel', 'falabella')
            .order('order_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastFalabellaOrder?.order_date) {
            const lastDate = new Date(lastFalabellaOrder.order_date);
            body.dateFrom = new Date(lastDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
          }
        }

        onSyncStart?.(channel);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const syncedOrders = result.orders || [];

        if (syncedOrders.length > 0) {
          const { error: upsertError } = await supabase.from('orders').upsert(syncedOrders, {
            onConflict: 'channel,order_id',
            ignoreDuplicates: false,
          });
          if (upsertError) throw new Error(upsertError.message);
        }

        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.invalidateQueries({ queryKey: ['analytics'] });

        const newData = queryClient.getQueryData<unknown[]>(['orders']);
        const countAfter = Array.isArray(newData) ? newData.length : 0;
        const newOrders = Math.max(0, countAfter - countBefore);
        countBefore = countAfter; // Actualizar base para el siguiente canal

        onSyncComplete?.(channel, newOrders);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onSyncError?.(channel, error);
      }
    }
  }, [queryClient]);

  useEffect(() => {
    if (!config.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalMs = config.intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(performSync, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.enabled, config.intervalMinutes, performSync]);

  return { performSync };
}
