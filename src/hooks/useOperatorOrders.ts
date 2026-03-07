import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { normalizeStr, BOGOTA_STATE_NORM, SANCHEZ_LOCALIDADES_NORM, GGGO_LOCALIDADES_NORM } from '@/lib/constants';
import { groupPackOrders } from '@/hooks/useOrders';
import type { Order } from '@/lib/types';

export type Sede = 'bulevar' | 'cedi' | 'medellin';

export interface OperatorOrders {
  sanchez: Order[];
  gggo: Order[];
  colecta: Order[];
  juan: Order[];       // Medellín only
  unassigned: Order[]; // Medellín FLEX sin asignar
}

// Bogotá = UTC-5
// Sánchez: entrega mismo día si se ordena antes de las 4 PM Bogotá = 21:00 UTC
// GG Go:   entrega mismo día si se ordena antes de la 1 PM Bogotá  = 18:00 UTC
const SANCHEZ_CUTOFF_UTC = 21;
const GGGO_CUTOFF_UTC = 18;

/**
 * CEDI Colecta: lookback amplio de 5 días para garantizar que los pedidos del
 * fin de semana siempre estén disponibles. El filtro preciso por hora de corte
 * se aplica en OperatorDeliveryCards usando prevCutoffISO del schedule de ML.
 */
function cediWindowStart(): Date {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 5);
  start.setUTCHours(5, 0, 0, 0); // medianoche Bogotá = 05:00 UTC
  return start;
}

function deliveryWindow(cutoffUtcHour: number): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(cutoffUtcHour, 0, 0, 0);

  const end = new Date();
  end.setUTCHours(cutoffUtcHour, 0, 0, 0);

  return { start, end };
}

export function useOperatorOrders(sede: Sede) {
  return useQuery({
    queryKey: ['operator-orders-today', sede],
    queryFn: async (): Promise<OperatorOrders> => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ── CEDI ──────────────────────────────────────────────────────────────
      if (sede === 'cedi') {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('order_date', cediWindowStart().toISOString())
          .eq('channel', 'mercadolibre')
          .eq('store_name', 'CEDI')
          .eq('logistic_type', 'cross_docking')
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false });
        if (error) throw new Error(error.message);
        return { sanchez: [], gggo: [], colecta: groupPackOrders((data ?? []) as Order[]), juan: [], unassigned: [] };
      }

      // ── MEDELLÍN ──────────────────────────────────────────────────────────
      if (sede === 'medellin') {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('order_date', todayStart.toISOString())
          .eq('channel', 'mercadolibre')
          .eq('store_name', 'MEDELLÍN')
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false });
        if (error) throw new Error(error.message);

        const all = (data ?? []) as Order[];
        const flex = all.filter(o => o.logistic_type === 'self_service');
        const cross = all.filter(o => o.logistic_type === 'cross_docking');

        return {
          sanchez: [],
          gggo: groupPackOrders(flex.filter(o => o.assigned_operator === 'gggo')),
          juan: groupPackOrders(flex.filter(o => o.assigned_operator === 'juan')),
          unassigned: groupPackOrders(flex.filter(o => !o.assigned_operator)),
          colecta: groupPackOrders(cross),
        };
      }

      // ── BULEVAR (default) ─────────────────────────────────────────────────
      const sanchezWin = deliveryWindow(SANCHEZ_CUTOFF_UTC); // [ayer 21:00 UTC, hoy 21:00 UTC)
      const gggoWin    = deliveryWindow(GGGO_CUTOFF_UTC);    // [ayer 18:00 UTC, hoy 18:00 UTC)
      // Usamos la ventana más amplia (GG Go) como inicio de query
      const queryStart = gggoWin.start;

      const [{ data: mlData, error: mlError }, { data: wixData, error: wixError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', queryStart.toISOString())
          .eq('channel', 'mercadolibre')
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', sanchezWin.start.toISOString())
          .eq('channel', 'wix')
          .not('halcon_serial', 'is', null)
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
      ]);

      if (mlError) throw new Error(mlError.message);
      if (wixError) throw new Error(wixError.message);

      // Wix → Sánchez: filtrar por ventana Sánchez en JS
      const sanchezRaw: Order[] = ((wixData ?? []) as Order[]).filter(o => {
        const d = new Date(o.order_date);
        return d >= sanchezWin.start && d < sanchezWin.end;
      });
      const gggoRaw: Order[] = [];
      const colectaRaw: Order[] = [];

      for (const order of (mlData ?? []) as Order[]) {
        const orderDate = new Date(order.order_date);

        // cross_docking → Colecta (solo pedidos de hoy)
        if (order.logistic_type === 'cross_docking') {
          if (orderDate >= todayStart) colectaRaw.push(order);
          continue;
        }

        // self_service → clasificar por localidad de Bogotá y ventana de entrega
        const stateNorm = normalizeStr(order.shipping_address?.state ?? '');
        if (stateNorm !== BOGOTA_STATE_NORM) continue;
        const cityNorm = normalizeStr(order.shipping_address?.city ?? '');

        if (SANCHEZ_LOCALIDADES_NORM.has(cityNorm)) {
          if (orderDate >= sanchezWin.start && orderDate < sanchezWin.end) sanchezRaw.push(order);
        } else if (GGGO_LOCALIDADES_NORM.has(cityNorm)) {
          if (orderDate >= gggoWin.start && orderDate < gggoWin.end) gggoRaw.push(order);
        }
      }

      return {
        sanchez: groupPackOrders(sanchezRaw),
        gggo: groupPackOrders(gggoRaw),
        colecta: groupPackOrders(colectaRaw),
        juan: [],
        unassigned: [],
      };
    },
    staleTime: 60 * 1000,
  });
}
