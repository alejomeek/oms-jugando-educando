import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { OrderStats } from '@/lib/types';

export function useOrderStats() {
    return useQuery({
        queryKey: ['order-stats'],
        queryFn: async (): Promise<OrderStats> => {
            // Inicio del día en hora local (Colombia UTC-5)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            const base = () =>
                supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .gte('order_date', todayISO);

            const [
                { count: total },
                { count: nuevo },
                { count: preparando },
                { count: enviado },
                { count: entregado },
                { count: mercadolibre },
                { count: wix },
            ] = await Promise.all([
                base(),
                base().eq('status', 'nuevo'),
                base().eq('status', 'preparando'),
                base().eq('status', 'enviado'),
                base().eq('status', 'entregado'),
                base().eq('channel', 'mercadolibre'),
                base().eq('channel', 'wix'),
            ]);

            return {
                total: total || 0,
                nuevo: nuevo || 0,
                preparando: preparando || 0,
                enviado: enviado || 0,
                entregado: entregado || 0,
                mercadolibre: mercadolibre || 0,
                wix: wix || 0,
            };
        },
        staleTime: 60 * 1000,
    });
}
