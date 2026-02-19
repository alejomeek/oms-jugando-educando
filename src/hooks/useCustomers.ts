import { useMemo } from 'react';
import type { Order } from '@/lib/types';

export interface CustomerProfile {
  key: string;                    // dedup key: "ml:12345" or "wix:email@x.com"
  channel: 'mercadolibre' | 'wix';
  displayName: string;            // ML: nickname or "ML-{id}", Wix: "firstName lastName" or email
  email?: string;                 // Wix only
  phone?: string;                 // Wix only
  nickname?: string;              // ML only
  customerId: string;             // original customer.id
  orderCount: number;
  ltv: number;                    // sum of total_amount across all orders
  avgTicket: number;              // ltv / orderCount
  firstOrderDate: string;         // ISO string of earliest order
  lastOrderDate: string;          // ISO string of most recent order
  orders: Order[];                // all orders sorted by date asc
  isVip: boolean;                 // top 20% by LTV
  isRepeat: boolean;              // orderCount > 1
  mostPurchasedProduct?: string;  // top product title by total quantity
  preferredCity?: string;         // most common shipping city
}

export interface CustomersSummary {
  totalCustomers: number;
  repeatCustomers: number;        // orderCount > 1
  retentionRate: number;          // % of repeat customers
  vipCount: number;
  avgLtv: number;
}

export interface UseCustomersResult {
  customers: CustomerProfile[];
  summary: CustomersSummary;
}

/**
 * Returns the number of distinct purchase events in an order list.
 * ML rows sharing a pack_id count as ONE event; everything else is its own.
 */
function countPurchaseEvents(orders: Order[]): number {
  const seen = new Set<string>();
  for (const o of orders) {
    seen.add(o.pack_id && o.channel === 'mercadolibre' ? o.pack_id : o.id);
  }
  return seen.size;
}

/**
 * Merges raw DB rows into purchase events for display (e.g. order history timeline).
 * Pack rows are combined: amounts are summed, first row metadata is kept.
 */
function groupToEvents(orders: Order[]): Order[] {
  const result: Order[] = [];
  const packMap = new Map<string, Order>();
  for (const order of orders) {
    if (!order.pack_id || order.channel !== 'mercadolibre') {
      result.push(order);
      continue;
    }
    const existing = packMap.get(order.pack_id);
    if (!existing) {
      const merged: Order = { ...order }; // shallow clone — do not mutate source
      packMap.set(order.pack_id, merged);
      result.push(merged);
    } else {
      existing.total_amount += order.total_amount;
    }
  }
  return result;
}

export function useCustomers(orders: Order[]): UseCustomersResult {
  return useMemo(() => {
    const profileMap = new Map<string, {
      channel: 'mercadolibre' | 'wix';
      displayName: string;
      email?: string;
      phone?: string;
      nickname?: string;
      customerId: string;
      orders: Order[];
      ltv: number;
    }>();

    for (const order of orders) {
      const c = order.customer;
      const key = c.source === 'mercadolibre'
        ? `ml:${c.id}`
        : `wix:${(c.email || c.id).toLowerCase()}`;

      const existing = profileMap.get(key);
      if (existing) {
        existing.orders.push(order);
        existing.ltv += order.total_amount;
      } else {
        const displayName = c.source === 'wix'
          ? ([c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id)
          : (c.nickname || `ML-${c.id}`);
        profileMap.set(key, {
          channel: c.source,
          displayName,
          email: c.email,
          phone: c.phone,
          nickname: c.nickname,
          customerId: c.id,
          orders: [order],
          ltv: order.total_amount,
        });
      }
    }

    // Build profiles array (before VIP assignment)
    const rawProfiles = Array.from(profileMap.entries()).map(([key, data]) => {
      // Sort orders chronologically
      const sortedOrders = [...data.orders].sort(
        (a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
      );

      // Most purchased product
      const itemFreq = new Map<string, number>();
      for (const o of data.orders) {
        for (const item of o.items || []) {
          itemFreq.set(item.title, (itemFreq.get(item.title) || 0) + item.quantity);
        }
      }
      const mostPurchasedProduct = Array.from(itemFreq.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      // Preferred city
      const cityFreq = new Map<string, number>();
      for (const o of data.orders) {
        const city = o.shipping_address?.city;
        if (city) cityFreq.set(city, (cityFreq.get(city) || 0) + 1);
      }
      const preferredCity = Array.from(cityFreq.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      // Deduplicated purchase event count: pack rows share one event key.
      const eventCount = countPurchaseEvents(data.orders);
      // Combine pack rows into events for the order history timeline.
      const eventOrders = groupToEvents(sortedOrders);

      return {
        key,
        channel: data.channel,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        nickname: data.nickname,
        customerId: data.customerId,
        orderCount: eventCount,
        ltv: data.ltv,
        avgTicket: data.ltv / eventCount,
        firstOrderDate: sortedOrders[0].order_date,
        lastOrderDate: sortedOrders[sortedOrders.length - 1].order_date,
        orders: eventOrders,
        isVip: false, // assigned below
        isRepeat: eventCount > 1,
        mostPurchasedProduct,
        preferredCity,
      };
    });

    // Assign VIP: top 20% by LTV
    const sortedByLtv = [...rawProfiles].sort((a, b) => b.ltv - a.ltv);
    const vipCutoff = Math.max(1, Math.ceil(sortedByLtv.length * 0.2));
    const vipKeys = new Set(sortedByLtv.slice(0, vipCutoff).map(p => p.key));
    const customers: CustomerProfile[] = rawProfiles.map(p => ({
      ...p,
      isVip: vipKeys.has(p.key),
    }));

    // Summary stats
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(p => p.isRepeat).length;
    const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    const vipCount = customers.filter(p => p.isVip).length;
    const avgLtv = totalCustomers > 0
      ? customers.reduce((s, p) => s + p.ltv, 0) / totalCustomers
      : 0;

    return {
      customers,
      summary: { totalCustomers, repeatCustomers, retentionRate, vipCount, avgLtv },
    };
  }, [orders]);
}
