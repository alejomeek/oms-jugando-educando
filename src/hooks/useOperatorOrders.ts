import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { normalizeStr, BOGOTA_STATE_NORM, SANCHEZ_LOCALIDADES_NORM, GGGO_LOCALIDADES_NORM } from '@/lib/constants';
import { groupPackOrders } from '@/hooks/useOrders';
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
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false });
        if (error) throw new Error(error.message);
        return { sanchez: [], gggo: [], colecta: groupPackOrders((data ?? []) as Order[]) };
      }

      // Bulevar: ML (self_service + cross_docking) + Wix con halcon_serial
      const [{ data: mlData, error: mlError }, { data: wixData, error: wixError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'mercadolibre')
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'wix')
          .not('halcon_serial', 'is', null)
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
      ]);

      if (mlError) throw new Error(mlError.message);
      if (wixError) throw new Error(wixError.message);

      const sanchezRaw: Order[] = (wixData ?? []) as Order[];
      const gggoRaw: Order[] = [];
      const colectaRaw: Order[] = [];

      for (const order of (mlData ?? []) as Order[]) {
        // cross_docking → siempre Colecta
        if (order.logistic_type === 'cross_docking') {
          colectaRaw.push(order);
          continue;
        }
        // self_service o null → clasificar por localidad de Bogotá
        const stateNorm = normalizeStr(order.shipping_address?.state ?? '');
        if (stateNorm !== BOGOTA_STATE_NORM) continue;
        const cityNorm = normalizeStr(order.shipping_address?.city ?? '');
        if (SANCHEZ_LOCALIDADES_NORM.has(cityNorm)) sanchezRaw.push(order);
        else if (GGGO_LOCALIDADES_NORM.has(cityNorm)) gggoRaw.push(order);
      }

      return {
        sanchez: groupPackOrders(sanchezRaw),
        gggo: groupPackOrders(gggoRaw),
        colecta: groupPackOrders(colectaRaw),
      };
    },
    staleTime: 60 * 1000,
  });
}
