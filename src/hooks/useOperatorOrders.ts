import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { normalizeStr, BOGOTA_STATE_NORM, SANCHEZ_LOCALIDADES_NORM, GGGO_LOCALIDADES_NORM } from '@/lib/constants';
import { groupPackOrders } from '@/hooks/useOrders';
import type { Order } from '@/lib/types';

export type Sede = 'bulevar' | 'cedi' | 'medellin';

export interface OperatorOrders {
  sanchez: Order[];
  gggo: Order[];
  sanchezUpcoming:    Order[]; // Bulevar Sánchez: cutoff > hoy (próximos 5 días)
  gggoUpcoming:       Order[]; // Bulevar/Medellín GG Go: cutoff > hoy
  juanUpcoming:       Order[]; // Medellín Juan: cutoff > hoy
  unassignedUpcoming: Order[]; // Medellín sin asignar: cutoff > hoy
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
 *
 * Usa la fecha actual en Bogotá (no UTC) para evitar el bug de medianoche:
 * después de las 7 PM Bogotá (= 00:00 UTC siguiente), getUTCDate() ya apunta
 * al día siguiente, lo que desplazaría la ventana un día adelante.
 */
function deliveryWindow(cutoffUtcHour: number): { start: Date; end: Date } {
  // Obtener la fecha actual en Bogotá desplazando 5h hacia atrás en UTC
  const bogotaNow = new Date(Date.now() - 5 * 3600 * 1000);
  // end = hoy en Bogotá a la hora de corte UTC
  const end = new Date(Date.UTC(
    bogotaNow.getUTCFullYear(),
    bogotaNow.getUTCMonth(),
    bogotaNow.getUTCDate(),
  ) + cutoffUtcHour * 3600 * 1000);
  // start = exactamente 24 h antes
  const start = new Date(end.getTime() - 24 * 3600 * 1000);
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

        // Filtrar: cutoff.date >= hoy (todos los pendientes y próximos, datepicker ve cada fecha).
        // Fallback para órdenes sin cutoff: order_date >= medianoche del día hábil anterior.
        const today = todayBogotaDate();
        const fallback = prevBusinessDayMidnightISO();
        const colecta = ((data ?? []) as Order[]).filter(o =>
          o.cutoff
            ? bogotaDateStr(new Date(o.cutoff)) >= today
            : new Date(o.order_date) >= new Date(fallback)
        );
        return { sanchez: [], gggo: [], sanchezUpcoming: [], gggoUpcoming: [], juanUpcoming: [], unassignedUpcoming: [], colecta: groupPackOrders(colecta), juan: [], unassigned: [] };
      }

      // ── MEDELLÍN ──────────────────────────────────────────────────────────
      if (sede === 'medellin') {
        const bogotaNowMed = new Date(Date.now() - 5 * 3600 * 1000);
        const tomorrowMed = new Date(Date.UTC(
          bogotaNowMed.getUTCFullYear(), bogotaNowMed.getUTCMonth(), bogotaNowMed.getUTCDate() + 1,
        ) + 5 * 3600 * 1000);
        const horizonMed = new Date(Date.UTC(
          bogotaNowMed.getUTCFullYear(), bogotaNowMed.getUTCMonth(), bogotaNowMed.getUTCDate() + 6,
        ) + 5 * 3600 * 1000);

        const [
          { data, error },
          { data: upcomingData, error: upcomingError },
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .gte('order_date', cediWindowStart().toISOString()) // lookback 5 días para capturar cross_docking con cutoff futuro
            .eq('channel', 'mercadolibre')
            .eq('store_name', 'MEDELLÍN')
            .not('status', 'eq', 'cancelado')
            .order('order_date', { ascending: false }),
          supabase
            .from('orders')
            .select('*')
            .gte('cutoff', tomorrowMed.toISOString())
            .lt('cutoff', horizonMed.toISOString())
            .eq('channel', 'mercadolibre')
            .eq('store_name', 'MEDELLÍN')
            .eq('logistic_type', 'self_service')
            .not('status', 'eq', 'cancelado')
            .order('cutoff', { ascending: true }),
        ]);
        if (error) throw new Error(error.message);
        if (upcomingError) throw new Error(upcomingError.message);

        const all = (data ?? []) as Order[];
        const todayMed = todayBogotaDate();
        // Medianoche Bogotá de hoy en UTC (para filtrar flex en JS)
        const bogotaTodayStartMed = new Date(Date.UTC(
          bogotaNowMed.getUTCFullYear(), bogotaNowMed.getUTCMonth(), bogotaNowMed.getUTCDate(),
        ) + 5 * 3600 * 1000);
        // Flex: cutoff === hoy (consistente con Bulevar). Fallback sin cutoff: order_date >= medianoche Bogotá.
        const flex = all.filter(o => {
          if (o.logistic_type !== 'self_service') return false;
          return o.cutoff
            ? bogotaDateStr(new Date(o.cutoff)) === todayMed
            : new Date(o.order_date) >= bogotaTodayStartMed;
        });
        // Cross_docking: cutoff >= hoy (hoy + futuros para el datepicker)
        const cross = all.filter(o =>
          o.logistic_type === 'cross_docking' && (
            o.cutoff
              ? bogotaDateStr(new Date(o.cutoff)) >= todayMed
              : new Date(o.order_date) >= bogotaTodayStartMed
          )
        );
        const upcoming = (upcomingData ?? []) as Order[];

        return {
          sanchez: [],
          gggo: groupPackOrders(flex.filter(o => o.assigned_operator === 'gggo')),
          sanchezUpcoming: [],
          gggoUpcoming: groupPackOrders(upcoming.filter(o => o.assigned_operator === 'gggo')),
          juanUpcoming: groupPackOrders(upcoming.filter(o => o.assigned_operator === 'juan')),
          unassignedUpcoming: groupPackOrders(upcoming.filter(o => !o.assigned_operator)),
          juan: groupPackOrders(flex.filter(o => o.assigned_operator === 'juan')),
          unassigned: groupPackOrders(flex.filter(o => !o.assigned_operator)),
          colecta: groupPackOrders(cross),
        };
      }

      // ── BULEVAR (default) ─────────────────────────────────────────────────
      const sanchezWin = deliveryWindow(SANCHEZ_CUTOFF_UTC); // [ayer 21:00 UTC, hoy 21:00 UTC)
      const gggoWin    = deliveryWindow(GGGO_CUTOFF_UTC);    // [ayer 18:00 UTC, hoy 18:00 UTC)

      // Horizonte para pedidos próximos (mañana → 5 días)
      const bogotaNow = new Date(Date.now() - 5 * 3600 * 1000);
      const tomorrowUTC = new Date(Date.UTC(
        bogotaNow.getUTCFullYear(), bogotaNow.getUTCMonth(), bogotaNow.getUTCDate() + 1,
      ) + 5 * 3600 * 1000); // medianoche Bogotá de mañana en UTC
      const horizonUTC = new Date(Date.UTC(
        bogotaNow.getUTCFullYear(), bogotaNow.getUTCMonth(), bogotaNow.getUTCDate() + 6,
      ) + 5 * 3600 * 1000); // medianoche Bogotá de hoy+5 días en UTC

      const [
        { data: mlData,       error: mlError },
        { data: wixData,      error: wixError },
        { data: upcomingData, error: upcomingError },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', cediWindowStart().toISOString()) // 5 días atrás: captura cross_docking con order_date nocturno/anterior
          .eq('channel', 'mercadolibre')
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .gte('order_date', sanchezWin.start.toISOString())
          .eq('channel', 'wix')
          .not('status', 'eq', 'cancelado')
          .order('order_date', { ascending: false }),
        // Pedidos ML self_service con cutoff mañana → hoy+5 días
        supabase
          .from('orders')
          .select('*')
          .gte('cutoff', tomorrowUTC.toISOString())
          .lt('cutoff', horizonUTC.toISOString())
          .eq('channel', 'mercadolibre')
          .in('store_name', ['BULEVAR', 'AVENIDA 19'])
          .eq('logistic_type', 'self_service')
          .not('status', 'eq', 'cancelado')
          .order('cutoff', { ascending: true }),
      ]);

      if (mlError)       throw new Error(mlError.message);
      if (wixError)      throw new Error(wixError.message);
      if (upcomingError) throw new Error(upcomingError.message);

      // Wix → Sánchez: órdenes dentro de la ventana de hoy
      const sanchezRaw: Order[] = ((wixData ?? []) as Order[]).filter(o => {
        const d = new Date(o.order_date);
        return d >= sanchezWin.start && d < sanchezWin.end;
      });

      // Wix upcoming: órdenes recibidas después del corte de 4 PM de hoy → entregan mañana
      // Se asigna cutoff sintético = mañana 4 PM Bogotá (= sanchezWin.end + 24h) para que
      // el DatePickerCard las agrupe en la tab correcta.
      const tomorrowSanchezCutoff = new Date(sanchezWin.end.getTime() + 24 * 3600 * 1000);
      const wixUpcoming: Order[] = ((wixData ?? []) as Order[])
        .filter(o => new Date(o.order_date) >= sanchezWin.end)
        .map(o => ({ ...o, cutoff: o.cutoff ?? tomorrowSanchezCutoff.toISOString() }));
      const gggoRaw: Order[] = [];
      const colectaRaw: Order[] = [];

      const today = todayBogotaDate();

      for (const order of (mlData ?? []) as Order[]) {
        const orderDate = new Date(order.order_date);

        // cross_docking → Colecta
        // Con cutoff: cutoff.date >= hoy (hoy + futuros para el datepicker).
        // Sin cutoff: order_date >= todayStart.
        if (order.logistic_type === 'cross_docking') {
          const show = order.cutoff
            ? bogotaDateStr(new Date(order.cutoff)) >= today
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

      // Distribuir pedidos próximos a Sánchez / GG Go según localidad
      const sanchezUpcomingRaw: Order[] = [...wixUpcoming]; // Wix after-cutoff siempre van a Sánchez
      const gggoUpcomingRaw: Order[] = [];
      for (const order of (upcomingData ?? []) as Order[]) {
        const stateNorm = normalizeStr(order.shipping_address?.state ?? '');
        if (stateNorm !== BOGOTA_STATE_NORM) continue;
        const cityNorm = normalizeStr(order.shipping_address?.city ?? '');
        if (SANCHEZ_LOCALIDADES_NORM.has(cityNorm)) {
          sanchezUpcomingRaw.push(order);
        } else if (GGGO_LOCALIDADES_NORM.has(cityNorm)) {
          gggoUpcomingRaw.push(order);
        }
      }

      return {
        sanchez: groupPackOrders(sanchezRaw),
        gggo: groupPackOrders(gggoRaw),
        sanchezUpcoming: groupPackOrders(sanchezUpcomingRaw),
        gggoUpcoming: groupPackOrders(gggoUpcomingRaw),
        juanUpcoming: [],
        unassignedUpcoming: [],
        colecta: groupPackOrders(colectaRaw),
        juan: [],
        unassigned: [],
      };
    },
    staleTime: 60 * 1000,
  });
}
