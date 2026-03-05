import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { normalizeStr, BOGOTA_STATE_NORM, SANCHEZ_LOCALIDADES_NORM, GGGO_LOCALIDADES_NORM } from '@/lib/constants';
import type { Order } from '@/lib/types';

export type Sede = 'bulevar' | 'cedi';

export interface OperatorOrders {
  sanchez: Order[];
  gggo: Order[];
  colecta: Order[];
}

export function useOperatorOrders(sede: Sede) {
  return useQuery({
    queryKey: ['operator-orders-today', sede],
    queryFn: async (): Promise<OperatorOrders> => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (sede === 'cedi') {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'mercadolibre')
          .eq('store_name', 'CEDI')
          .eq('logistic_type', 'cross_docking')
          .in('status', ['nuevo', 'preparando'])
          .order('order_date', { ascending: false });
        if (error) throw new Error(error.message);
        return { sanchez: [], gggo: [], colecta: (data ?? []) as Order[] };
      }

      // Bulevar: ML (self_service + cross_docking) + Wix con halcon_serial
      const [{ data: mlData, error: mlError }, { data: wixData, error: wixError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'mercadolibre')
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .in('logistic_type', ['self_service', 'cross_docking'])
          .in('status', ['nuevo', 'preparando'])
          .order('order_date', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'wix')
          .not('halcon_serial', 'is', null)
          .in('status', ['nuevo', 'preparando'])
          .order('order_date', { ascending: false }),
      ]);

      if (mlError) throw new Error(mlError.message);
      if (wixError) throw new Error(wixError.message);

      const sanchez: Order[] = (wixData ?? []) as Order[];
      const gggo: Order[] = [];
      const colecta: Order[] = [];

      for (const order of (mlData ?? []) as Order[]) {
        if (order.logistic_type === 'cross_docking') {
          colecta.push(order);
          continue;
        }
        const stateNorm = normalizeStr(order.shipping_address?.state ?? '');
        if (stateNorm !== BOGOTA_STATE_NORM) continue;
        const cityNorm = normalizeStr(order.shipping_address?.city ?? '');
        if (SANCHEZ_LOCALIDADES_NORM.has(cityNorm)) sanchez.push(order);
        else if (GGGO_LOCALIDADES_NORM.has(cityNorm)) gggo.push(order);
      }

      return { sanchez, gggo, colecta };
    },
    staleTime: 60 * 1000,
  });
}
