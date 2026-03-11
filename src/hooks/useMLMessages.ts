import { useQuery } from '@tanstack/react-query';
import type { MLMessage, Order } from '@/lib/types';

const ML_CREDS = () => ({
  accessToken: import.meta.env.VITE_ML_ACCESS_TOKEN,
  refreshToken: import.meta.env.VITE_ML_REFRESH_TOKEN,
  clientId: import.meta.env.VITE_ML_CLIENT_ID,
  clientSecret: import.meta.env.VITE_ML_CLIENT_SECRET,
});

export function useMLMessages(order: Order | null) {
  const packId = order?.pack_id || order?.order_id;

  return useQuery<MLMessage[]>({
    queryKey: ['ml-messages', packId],
    queryFn: async () => {
      const response = await fetch('/api/ml-messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'messages',
          ...ML_CREDS(),
          packId,
          sellerId: import.meta.env.VITE_ML_SELLER_ID,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Error al cargar mensajes');
      return data.messages || [];
    },
    enabled: !!order && order.channel === 'mercadolibre' && !!packId,
    staleTime: 60_000,
  });
}

export function useMLUnreadMessages() {
  return useQuery<Record<string, number>>({
    queryKey: ['ml-unread-messages'],
    queryFn: async () => {
      const response = await fetch('/api/ml-messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unread',
          ...ML_CREDS(),
          sellerId: import.meta.env.VITE_ML_SELLER_ID,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Error al cargar mensajes no leídos');
      return data.unreadMap || {};
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}
