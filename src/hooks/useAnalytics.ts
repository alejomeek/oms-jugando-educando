import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export interface ChannelStats {
  channel: 'mercadolibre' | 'wix';
  orderCount: number;
  totalRevenue: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  orderCount: number;
  revenue: number;
}

export interface StatusStats {
  status: string;
  count: number;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  byChannel: ChannelStats[];
  byStatus: StatusStats[];
  recentDays: DailyStats[]; // last 30 days
  recentWeeks: DailyStats[]; // last 12 weeks (aggregated by week)
}

export function useAnalytics(dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async (): Promise<AnalyticsSummary> => {
      let baseQuery = supabase.from('orders').select('channel, status, total_amount, order_date');

      if (dateRange) {
        baseQuery = baseQuery
          .gte('order_date', dateRange.from.toISOString())
          .lte('order_date', dateRange.to.toISOString());
      }

      const { data: orders, error } = await baseQuery;
      if (error) throw new Error(`Error fetching analytics: ${error.message}`);
      if (!orders) return { totalOrders: 0, totalRevenue: 0, byChannel: [], byStatus: [], recentDays: [], recentWeeks: [] };

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // By channel
      const channelMap = new Map<string, { orderCount: number; totalRevenue: number }>();
      for (const o of orders) {
        const existing = channelMap.get(o.channel) || { orderCount: 0, totalRevenue: 0 };
        channelMap.set(o.channel, {
          orderCount: existing.orderCount + 1,
          totalRevenue: existing.totalRevenue + (o.total_amount || 0),
        });
      }
      const byChannel: ChannelStats[] = Array.from(channelMap.entries()).map(([channel, stats]) => ({
        channel: channel as 'mercadolibre' | 'wix',
        ...stats,
      }));

      // By status
      const statusMap = new Map<string, number>();
      for (const o of orders) {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
      }
      const byStatus: StatusStats[] = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

      // Daily stats (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dayMap = new Map<string, { orderCount: number; revenue: number }>();

      for (const o of orders) {
        const date = new Date(o.order_date);
        if (date < thirtyDaysAgo) continue;
        const key = date.toISOString().split('T')[0];
        const existing = dayMap.get(key) || { orderCount: 0, revenue: 0 };
        dayMap.set(key, {
          orderCount: existing.orderCount + 1,
          revenue: existing.revenue + (o.total_amount || 0),
        });
      }
      const recentDays: DailyStats[] = Array.from(dayMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Weekly stats (last 12 weeks)
      const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      const weekMap = new Map<string, { orderCount: number; revenue: number }>();

      for (const o of orders) {
        const date = new Date(o.order_date);
        if (date < twelveWeeksAgo) continue;
        // Get week start (Monday) without mutating date
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
        const key = weekStart.toISOString().split('T')[0];
        const existing = weekMap.get(key) || { orderCount: 0, revenue: 0 };
        weekMap.set(key, {
          orderCount: existing.orderCount + 1,
          revenue: existing.revenue + (o.total_amount || 0),
        });
      }
      const recentWeeks: DailyStats[] = Array.from(weekMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { totalOrders, totalRevenue, byChannel, byStatus, recentDays, recentWeeks };
    },
    staleTime: 5 * 60 * 1000,
  });
}
