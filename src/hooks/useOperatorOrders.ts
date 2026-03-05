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

      let query = supabase
        .from('orders')
        .select('*')
        .gte('order_date', todayStart.toISOString())
        .eq('channel', 'mercadolibre')
        .in('status', ['nuevo', 'preparando'])
        .order('order_date', { ascending: false });

      if (sede === 'bulevar') {
        query = query
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .in('logistic_type', ['self_service', 'cross_docking']);
      } else {
        query = query
          .eq('store_name', 'CEDI')
          .eq('logistic_type', 'cross_docking');
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const orders = (data ?? []) as Order[];

      if (sede === 'cedi') {
        return { sanchez: [], gggo: [], colecta: orders };
      }

      const sanchez: Order[] = [];
      const gggo: Order[] = [];
      const colecta: Order[] = [];

      for (const order of orders) {
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
