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

// ── Helpers de fecha Bogotá ────────────────────────────────────────────────

/** YYYY-MM-DD de una Date en zona horaria Bogotá (UTC-5) */
function bogotaDateStr(d: Date): string {
  return new Date(d.getTime() - 5 * 3600 * 1000).toISOString().split('T')[0];
}

/** Fecha de hoy en Bogotá como YYYY-MM-DD */
function todayBogotaDate(): string {
  return bogotaDateStr(new Date());
}

/**
 * Próxima fecha de Colecta en Bogotá:
 *   - Lun–Vie: hoy
 *   - Sáb:     próximo lunes (+2 días)
 *   - Dom:     próximo lunes (+1 día)
 * Así el CEDI muestra en fin de semana los pedidos que van el lunes.
 */
function nextColectaDate(): string {
  const now = new Date();
  const bogotaDay = new Date(now.getTime() - 5 * 3600 * 1000).getUTCDay();
  const daysAdd = bogotaDay === 6 ? 2 : bogotaDay === 0 ? 1 : 0;
  if (daysAdd > 0) now.setDate(now.getDate() + daysAdd);
  return bogotaDateStr(now);
}

/**
 * Medianoche del día hábil anterior en Bogotá → UTC ISO.
 * Fallback para órdenes sin campo cutoff (datos pre-migración).
 */
function prevBusinessDayMidnightISO(): string {
  const bogotaNow = new Date(Date.now() - 5 * 3600 * 1000);
  const bogotaDay = bogotaNow.getUTCDay();
  const daysBack = bogotaDay === 0 ? 2 : bogotaDay === 1 ? 3 : 1;
  const d = new Date(bogotaNow);
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(5, 0, 0, 0); // medianoche Bogotá = 05:00 UTC
  return d.toISOString();
}

/**
 * CEDI Colecta: lookback de 5 días para garantizar que los pedidos del
 * fin de semana (y pedidos sin cutoff) siempre estén disponibles.
 */
function cediWindowStart(): Date {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 5);
  start.setUTCHours(5, 0, 0, 0); // medianoche Bogotá = 05:00 UTC
  return start;
}

/**
 * Ventana de entrega Flex — fallback para órdenes sin campo cutoff (Wix y datos legacy).
 * cutoffUtcHour: hora de corte en UTC (Bogotá = UTC-5; ej. 4 PM Bogotá = 21 UTC)
 */
function deliveryWindow(cutoffUtcHour: number): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(cutoffUtcHour, 0, 0, 0);

  const end = new Date();
  end.setUTCHours(cutoffUtcHour, 0, 0, 0);

  return { start, end };
}

// Fallback UTC hours (solo para órdenes SIN campo cutoff)
const SANCHEZ_CUTOFF_UTC = 21; // 4 PM Bogotá
const GGGO_CUTOFF_UTC    = 18; // 1 PM Bogotá

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

        // Filtrar: cutoff.date === próxima fecha de Colecta (lunes si es fin de semana)
        // Fallback para órdenes sin cutoff: order_date >= medianoche del día hábil anterior
        const target = nextColectaDate();
        const fallback = prevBusinessDayMidnightISO();
        const colecta = ((data ?? []) as Order[]).filter(o =>
          o.cutoff
            ? bogotaDateStr(new Date(o.cutoff)) === target
            : new Date(o.order_date) >= new Date(fallback)
        );
        return { sanchez: [], gggo: [], colecta: groupPackOrders(colecta), juan: [], unassigned: [] };
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

      const today = todayBogotaDate();

      for (const order of (mlData ?? []) as Order[]) {
        const orderDate = new Date(order.order_date);

        // cross_docking → Colecta
        // Con cutoff: usar cutoff.date === hoy. Sin cutoff: order_date >= todayStart.
        if (order.logistic_type === 'cross_docking') {
          const show = order.cutoff
            ? bogotaDateStr(new Date(order.cutoff)) === today
            : orderDate >= todayStart;
          if (show) colectaRaw.push(order);
          continue;
        }

        // self_service → clasificar por localidad de Bogotá
        const stateNorm = normalizeStr(order.shipping_address?.state ?? '');
        if (stateNorm !== BOGOTA_STATE_NORM) continue;
        const cityNorm = normalizeStr(order.shipping_address?.city ?? '');

        if (SANCHEZ_LOCALIDADES_NORM.has(cityNorm)) {
          const show = order.cutoff
            ? bogotaDateStr(new Date(order.cutoff)) === today
            : (orderDate >= sanchezWin.start && orderDate < sanchezWin.end);
          if (show) sanchezRaw.push(order);
        } else if (GGGO_LOCALIDADES_NORM.has(cityNorm)) {
          const show = order.cutoff
            ? bogotaDateStr(new Date(order.cutoff)) === today
            : (orderDate >= gggoWin.start && orderDate < gggoWin.end);
          if (show) gggoRaw.push(order);
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
