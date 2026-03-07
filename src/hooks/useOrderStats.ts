import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { OrderFilters, OrderStats } from '@/lib/types';
import type { Sede } from '@/hooks/useOperatorOrders';

type StatsFilters = Pick<OrderFilters, 'channel' | 'store' | 'status'> & { sede?: Sede };

export function useOrderStats(filters?: StatsFilters) {
    return useQuery({
        queryKey: ['order-stats', filters],
        queryFn: async (): Promise<OrderStats> => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            const base = () => {
                let q = supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .gte('order_date', todayISO);

                if (filters?.channel) q = q.eq('channel', filters.channel);

                // Sede filter takes precedence over store filter
                if (filters?.sede === 'bulevar') {
                    // Include all orders NOT from CEDI or MEDELLÍN (covers Wix/Falabella with null store_name)
                    q = q.or('store_name.is.null,store_name.not.in.(CEDI,MEDELLÍN)');
                } else if (filters?.sede === 'cedi') {
                    q = q.eq('store_name', 'CEDI');
                } else if (filters?.sede === 'medellin') {
                    q = q.eq('store_name', 'MEDELLÍN');
                } else if (filters?.store && filters.store.length > 0) {
                    q = q.in('store_name', filters.store);
                }

                return q;
            };

            const [
                { count: total },
                { count: nuevo },
                { count: preparando },
                { count: enviado },
                { count: entregado },
                { count: mercadolibre },
                { count: wix },
                { count: falabella },
            ] = await Promise.all([
                filters?.status ? base().eq('status', filters.status) : base(),
                base().eq('status', 'nuevo'),
                base().eq('status', 'preparando'),
                base().eq('status', 'enviado'),
                base().eq('status', 'entregado'),
                base().eq('channel', 'mercadolibre'),
                base().eq('channel', 'wix'),
                base().eq('channel', 'falabella'),
            ]);

            return {
                total: total || 0,
                nuevo: nuevo || 0,
                preparando: preparando || 0,
                enviado: enviado || 0,
                entregado: entregado || 0,
                mercadolibre: mercadolibre || 0,
                wix: wix || 0,
                falabella: falabella || 0,
            };
        },
        staleTime: 60 * 1000,
    });
}
