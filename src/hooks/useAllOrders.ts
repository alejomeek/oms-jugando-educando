import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Order } from '@/lib/types';

const PAGE_SIZE = 1000; // Supabase/PostgREST default max per request

/**
 * Downloads every order from Supabase by paginating in PAGE_SIZE batches.
 * Stops when a batch returns fewer rows than PAGE_SIZE (last page reached).
 * Typical cost: ~6 requests for 5 300 records.
 */
async function fetchAllOrdersFromDb(): Promise<Order[]> {
  const all: Order[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Error al obtener pedidos (rango ${from}-${to}): ${error.message}`);

    const batch = (data || []) as Order[];
    all.push(...batch);

    // If we got fewer rows than requested, we've reached the last page
    if (batch.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Fetches ALL orders from Supabase without pagination or pack grouping.
 * Uses batched range queries to bypass the 1 000-row PostgREST default limit.
 * React Query caches the full result so CRM and Analytics share one fetch.
 */
export function useAllOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders-all'],
    queryFn: fetchAllOrdersFromDb,
    staleTime: 5 * 60 * 1000, // 5 min cache — re-fetches after sync events
  });
}
