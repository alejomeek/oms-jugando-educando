import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { OrderEvent } from '@/lib/types';

const MAX_EVENTS = 50;

export function useActivityFeed() {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga inicial
  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_EVENTS);

      if (!error && data) {
        setEvents(data as OrderEvent[]);
      }
      setIsLoading(false);
    })();
  }, []);

  // Suscripción Realtime — escucha INSERT en order_events
  useEffect(() => {
    const channel = supabase
      .channel('order_events_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events' },
        (payload) => {
          const newEvent = payload.new as OrderEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { events, isLoading };
}
