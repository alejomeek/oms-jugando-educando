import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { OrderEvent } from '@/lib/types';

const MAX_EVENTS = 50;

// Eventos relevantes para el feed: creación, en camino, entrega, remisión y Halcón.
// Los demás cambios de estado (nuevo, preparando, cancelado) no se muestran.
const RELEVANT_FILTER =
  'event_type.in.(order_created,remision_assigned,halcon_assigned),and(event_type.eq.status_changed,new_value.in.(enviado,entregado))';

function isRelevantEvent(event: OrderEvent): boolean {
  if (event.event_type === 'order_created') return true;
  if (event.event_type === 'remision_assigned') return true;
  if (event.event_type === 'halcon_assigned') return true;
  if (event.event_type === 'status_changed' && event.new_value === 'enviado') return true;
  if (event.event_type === 'status_changed' && event.new_value === 'entregado') return true;
  return false;
}

export function useActivityFeed() {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga inicial — join con orders para traer pack_id
  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('order_events')
        .select('*, orders(pack_id)')
        .or(RELEVANT_FILTER)
        .order('created_at', { ascending: false })
        .limit(MAX_EVENTS);

      if (!error && data) {
        setEvents(data as OrderEvent[]);
      }
      setIsLoading(false);
    })();
  }, []);

  // Suscripción Realtime — INSERT en order_events
  useEffect(() => {
    const channel = supabase
      .channel('order_events_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events' },
        async (payload) => {
          const raw = payload.new as OrderEvent;

          // Filtrar eventos que no nos interesan
          if (!isRelevantEvent(raw)) return;

          // Re-fetch con join para obtener pack_id del evento insertado
          const { data } = await supabase
            .from('order_events')
            .select('*, orders(pack_id)')
            .eq('id', raw.id)
            .single();

          if (data) {
            setEvents((prev) => [data as OrderEvent, ...prev].slice(0, MAX_EVENTS));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { events, isLoading };
}
