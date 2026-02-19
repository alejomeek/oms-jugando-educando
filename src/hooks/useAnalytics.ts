import { useMemo } from 'react';
import type { Order } from '@/lib/types';

export interface ChannelStats {
  channel: 'mercadolibre' | 'wix';
  orderCount: number;
  totalRevenue: number;
  avgTicket: number;
  percentOfTotal: number; // % of total orders
}

export interface DailyStats {
  date: string;        // YYYY-MM-DD
  orderCount: number;
  revenue: number;
}

export interface StatusStats {
  status: string;
  count: number;
}

export interface TopProduct {
  sku: string;
  title: string;
  totalQuantity: number;
  totalRevenue: number;
  imageUrl?: string;
  orderCount: number;  // how many distinct orders contain this product
}

export interface GeoStats {
  city: string;
  state: string;
  orderCount: number;
  revenue: number;
}

export interface PaymentMethodStats {
  method: string;       // raw key, e.g. "visa"
  label: string;        // display name, e.g. "Visa"
  orderCount: number;
  revenue: number;
}

export interface InstallmentsInsight {
  upfront: number;        // orders paid in full (installments === 1 or unknown)
  financed: number;       // orders with installments > 1
  financedRevenue: number;
}

export interface KeyInsight {
  label: string;        // e.g. "Ventas este mes vs mes anterior"
  value: string;        // e.g. "+23%"
  trend: 'up' | 'down' | 'flat';
  detail?: string;      // e.g. "89 pedidos vs 72 el mes pasado"
}

export interface DayOfWeekStats {
  day: string;          // "Lun", "Mar", ..., "Dom"
  avgOrders: number;    // average orders on this day
  totalOrders: number;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  byChannel: ChannelStats[];
  byStatus: StatusStats[];
  recentDays: DailyStats[];     // last 30 days (or filtered range)
  recentWeeks: DailyStats[];    // last 12 weeks (or filtered range)
  topProducts: TopProduct[];    // top 10 by totalQuantity
  geoStats: GeoStats[];         // top 15 cities by orderCount
  keyInsights: KeyInsight[];    // 3-5 auto-generated insights
  byDayOfWeek: DayOfWeekStats[];
  byPaymentMethod: PaymentMethodStats[];
  installmentsInsight: InstallmentsInsight;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const PAYMENT_LABELS: Record<string, string> = {
  visa: 'Visa',
  master: 'Mastercard',
  debmaster: 'Débito Mastercard',
  pse: 'PSE',
  efecty: 'Efecty',
  amex: 'Amex',
  diners: 'Diners',
  naranja: 'Naranja',
  cabal: 'Cabal',
};

const EMPTY: AnalyticsSummary = {
  totalOrders: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
  byChannel: [],
  byStatus: [],
  recentDays: [],
  recentWeeks: [],
  topProducts: [],
  geoStats: [],
  keyInsights: [],
  byDayOfWeek: [],
  byPaymentMethod: [],
  installmentsInsight: { upfront: 0, financed: 0, financedRevenue: 0 },
};

export function useAnalytics(orders: Order[], dateRange?: { from: Date; to: Date }): AnalyticsSummary {
  return useMemo(() => {
    if (!orders || orders.length === 0) return EMPTY;

    // Apply date range filter
    const filtered = dateRange
      ? orders.filter(o => {
          const d = new Date(o.order_date);
          return d >= dateRange.from && d <= dateRange.to;
        })
      : orders;

    if (filtered.length === 0) return EMPTY;

    // Track distinct purchase events: ML pack rows sharing a pack_id = one event.
    const seenEventKeys = new Set<string>();
    let totalRevenue = 0;

    // Aggregation maps — single pass
    const channelMap = new Map<string, { orderCount: number; totalRevenue: number }>();
    const statusMap = new Map<string, number>();
    const dayMap = new Map<string, { orderCount: number; revenue: number }>();
    const weekMap = new Map<string, { orderCount: number; revenue: number }>();
    // sku -> aggregated product stats
    const productMap = new Map<string, {
      sku: string;
      title: string;
      totalQuantity: number;
      totalRevenue: number;
      imageUrl?: string;
      orderIds: Set<string>;
    }>();
    const geoMap = new Map<string, { city: string; state: string; orderCount: number; revenue: number }>();
    // day of week (0=Sun..6=Sat) -> event count
    const dowMap = new Map<number, number>();
    // payment method -> count + revenue (event-level)
    const paymentMap = new Map<string, { count: number; revenue: number }>();
    let upfrontCount = 0;
    let financedCount = 0;
    let financedRevenue = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

    // Customer event map for retention insight
    const customerOrders = new Map<string, number>();

    for (const order of filtered) {
      const amount = order.total_amount || 0;
      // Revenue is always accumulated: partial amounts across pack rows sum to cart total.
      totalRevenue += amount;

      // Determine whether this row opens a new purchase event.
      // ML rows sharing a pack_id belong to one cart purchase — count as one event.
      const eventKey = order.pack_id && order.channel === 'mercadolibre'
        ? `pack:${order.pack_id}`
        : `order:${order.id}`;
      const isFirstInEvent = !seenEventKeys.has(eventKey);
      if (isFirstInEvent) seenEventKeys.add(eventKey);

      // Channel — orderCount counts events; revenue sums all rows (correct)
      const ch = channelMap.get(order.channel) || { orderCount: 0, totalRevenue: 0 };
      channelMap.set(order.channel, {
        orderCount: ch.orderCount + (isFirstInEvent ? 1 : 0),
        totalRevenue: ch.totalRevenue + amount,
      });

      // Status — one event has one status
      if (isFirstInEvent) {
        statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
      }

      const date = new Date(order.order_date);

      // Daily stats (last 30 days or within range)
      const cutoffDay = dateRange ? dateRange.from : thirtyDaysAgo;
      if (date >= cutoffDay) {
        const dayKey = order.order_date.split('T')[0];
        const d = dayMap.get(dayKey) || { orderCount: 0, revenue: 0 };
        dayMap.set(dayKey, {
          orderCount: d.orderCount + (isFirstInEvent ? 1 : 0),
          revenue: d.revenue + amount,
        });
      }

      // Weekly stats (last 12 weeks or within range)
      const cutoffWeek = dateRange ? dateRange.from : twelveWeeksAgo;
      if (date >= cutoffWeek) {
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
        const weekKey = weekStart.toISOString().split('T')[0];
        const w = weekMap.get(weekKey) || { orderCount: 0, revenue: 0 };
        weekMap.set(weekKey, {
          orderCount: w.orderCount + (isFirstInEvent ? 1 : 0),
          revenue: w.revenue + amount,
        });
      }

      // Products — iterate every row's items (each row contributes real purchased items)
      for (const item of order.items || []) {
        const productKey = (item.sku && item.sku.trim() !== '' && item.sku !== '-')
          ? item.sku
          : item.title;
        const p = productMap.get(productKey);
        if (p) {
          p.totalQuantity += item.quantity;
          p.totalRevenue += item.fullPrice * item.quantity;
          p.orderIds.add(eventKey); // eventKey: pack rows share one entry
        } else {
          productMap.set(productKey, {
            sku: item.sku || '',
            title: item.title,
            totalQuantity: item.quantity,
            totalRevenue: item.fullPrice * item.quantity,
            imageUrl: item.imageUrl,
            orderIds: new Set([eventKey]),
          });
        }
      }

      // Geo — one destination per event; revenue from all rows (same address)
      const city = order.shipping_address?.city;
      const state = order.shipping_address?.state || '';
      if (city) {
        const geoKey = `${city}::${state}`;
        const g = geoMap.get(geoKey) || { city, state, orderCount: 0, revenue: 0 };
        geoMap.set(geoKey, {
          city, state,
          orderCount: g.orderCount + (isFirstInEvent ? 1 : 0),
          revenue: g.revenue + amount,
        });
      }

      // Day of week — count events
      if (isFirstInEvent) {
        const dow = date.getDay();
        dowMap.set(dow, (dowMap.get(dow) || 0) + 1);
      }

      // Payment method & installments — event-level only
      if (isFirstInEvent) {
        const method = order.payment_info?.method?.toLowerCase();
        if (method) {
          const p = paymentMap.get(method) || { count: 0, revenue: 0 };
          paymentMap.set(method, { count: p.count + 1, revenue: p.revenue + amount });
        }
        const installments = order.payment_info?.installments ?? 1;
        if (installments > 1) {
          financedCount++;
          financedRevenue += amount;
        } else {
          upfrontCount++;
        }
      }

      // Customer retention — count events per customer key
      if (isFirstInEvent) {
        const c = order.customer;
        const customerKey = c.source === 'mercadolibre'
          ? `ml:${c.id}`
          : `wix:${(c.email || c.id).toLowerCase()}`;
        customerOrders.set(customerKey, (customerOrders.get(customerKey) || 0) + 1);
      }
    }

    const totalOrders = seenEventKeys.size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // byChannel
    const byChannel: ChannelStats[] = Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel: channel as 'mercadolibre' | 'wix',
      orderCount: stats.orderCount,
      totalRevenue: stats.totalRevenue,
      avgTicket: stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0,
      percentOfTotal: totalOrders > 0 ? (stats.orderCount / totalOrders) * 100 : 0,
    }));

    // byStatus
    const byStatus: StatusStats[] = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // recentDays
    const recentDays: DailyStats[] = Array.from(dayMap.entries())
      .map(([date, s]) => ({ date, orderCount: s.orderCount, revenue: s.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // recentWeeks
    const recentWeeks: DailyStats[] = Array.from(weekMap.entries())
      .map(([date, s]) => ({ date, orderCount: s.orderCount, revenue: s.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // topProducts
    const topProducts: TopProduct[] = Array.from(productMap.values())
      .map(p => ({
        sku: p.sku,
        title: p.title,
        totalQuantity: p.totalQuantity,
        totalRevenue: p.totalRevenue,
        imageUrl: p.imageUrl,
        orderCount: p.orderIds.size,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // geoStats
    const geoStats: GeoStats[] = Array.from(geoMap.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 15);

    // byPaymentMethod
    const byPaymentMethod: PaymentMethodStats[] = Array.from(paymentMap.entries())
      .map(([method, stats]) => ({
        method,
        label: PAYMENT_LABELS[method] ?? method,
        orderCount: stats.count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // installmentsInsight
    const installmentsInsight: InstallmentsInsight = {
      upfront: upfrontCount,
      financed: financedCount,
      financedRevenue,
    };

    // byDayOfWeek — normalize to Mon-Sun display order
    // Calculate number of unique weeks in data to get avg
    const uniqueWeeks = weekMap.size || 1;
    const byDayOfWeek: DayOfWeekStats[] = [1, 2, 3, 4, 5, 6, 0].map(dow => ({
      day: DAY_NAMES[dow],
      totalOrders: dowMap.get(dow) || 0,
      avgOrders: Math.round(((dowMap.get(dow) || 0) / uniqueWeeks) * 10) / 10,
    }));

    // ── Key Insights ──────────────────────────────────────────────────────────

    const keyInsights: KeyInsight[] = [];

    // 1. Month-over-month
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let thisMonthCount = 0;
    let lastMonthCount = 0;
    // Reuse seenEventKeys: iterate filtered but skip duplicate event rows
    const countedMomEvents = new Set<string>();
    for (const order of filtered) {
      const momKey = order.pack_id && order.channel === 'mercadolibre'
        ? `pack:${order.pack_id}`
        : `order:${order.id}`;
      if (countedMomEvents.has(momKey)) continue;
      countedMomEvents.add(momKey);
      const d = new Date(order.order_date);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) thisMonthCount++;
      if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) lastMonthCount++;
    }
    if (lastMonthCount > 0 || thisMonthCount > 0) {
      const momChange = lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : 100;
      const trend: 'up' | 'down' | 'flat' = momChange > 0 ? 'up' : momChange < 0 ? 'down' : 'flat';
      keyInsights.push({
        label: 'Pedidos este mes vs mes anterior',
        value: `${momChange > 0 ? '+' : ''}${momChange}%`,
        trend,
        detail: `${thisMonthCount} pedidos vs ${lastMonthCount} el mes pasado`,
      });
    }

    // 2. Best channel by avg ticket
    if (byChannel.length >= 2) {
      const best = [...byChannel].sort((a, b) => b.avgTicket - a.avgTicket)[0];
      keyInsights.push({
        label: 'Canal con ticket promedio más alto',
        value: best.channel === 'mercadolibre' ? 'Mercado Libre' : 'Wix',
        trend: 'up',
        detail: `$${best.avgTicket.toFixed(0)} promedio por pedido`,
      });
    }

    // 3. Best day of week
    const bestDow = [...byDayOfWeek].sort((a, b) => b.totalOrders - a.totalOrders)[0];
    if (bestDow && bestDow.totalOrders > 0) {
      keyInsights.push({
        label: 'Día de mayor actividad',
        value: bestDow.day,
        trend: 'up',
        detail: `${bestDow.totalOrders} pedidos en total los ${bestDow.day}`,
      });
    }

    // 4. Retention rate
    const totalCustomers = customerOrders.size;
    const repeatCustomers = Array.from(customerOrders.values()).filter(n => n > 1).length;
    if (totalCustomers > 0) {
      const retentionPct = Math.round((repeatCustomers / totalCustomers) * 100);
      keyInsights.push({
        label: 'Clientes recurrentes',
        value: `${retentionPct}%`,
        trend: retentionPct >= 20 ? 'up' : 'flat',
        detail: `${repeatCustomers} de ${totalCustomers} clientes compraron más de una vez`,
      });
    }

    // 5. Top city
    if (geoStats.length > 0) {
      const top = geoStats[0];
      keyInsights.push({
        label: 'Ciudad con más pedidos',
        value: top.city,
        trend: 'flat',
        detail: `${top.orderCount} pedidos enviados a ${top.city}`,
      });
    }

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      byChannel,
      byStatus,
      recentDays,
      recentWeeks,
      topProducts,
      geoStats,
      keyInsights,
      byDayOfWeek,
      byPaymentMethod,
      installmentsInsight,
    };
  }, [orders, dateRange]);
}
