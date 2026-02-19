import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { OrderStats } from '@/lib/types';

export function useOrderStats() {
    return useQuery({
        queryKey: ['order-stats'],
        queryFn: async (): Promise<OrderStats> => {
            // Execute all count queries in parallel
            const [
                { count: total },
                { count: nuevo },
                { count: preparando },
                { count: listo },
                { count: enviado },
                { count: mercadolibre },
                { count: wix },
            ] = await Promise.all([
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'preparando'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'listo'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('channel', 'mercadolibre'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('channel', 'wix'),
            ]);

            return {
                total: total || 0,
                nuevo: nuevo || 0,
                preparando: preparando || 0,
                listo: listo || 0,
                enviado: enviado || 0,
                mercadolibre: mercadolibre || 0,
                wix: wix || 0,
            };
        },
        // Refresh stats every minute or when invalidated
        staleTime: 60 * 1000,
    });
}
