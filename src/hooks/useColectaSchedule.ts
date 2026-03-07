import { useQuery } from '@tanstack/react-query';

export interface ColectaSlot {
  from: string;   // "13:45"
  to: string;     // "15:45"
  cutoff: string; // "12:45" — hora límite en Bogotá para incluir un pedido en este pickup
}

export function useColectaSchedule() {
  return useQuery({
    queryKey: ['colecta-schedule'],
    queryFn: async (): Promise<ColectaSlot[]> => {
      const config = {
        accessToken: import.meta.env.VITE_ML_ACCESS_TOKEN,
        refreshToken: import.meta.env.VITE_ML_REFRESH_TOKEN,
        sellerId: import.meta.env.VITE_ML_SELLER_ID,
        clientId: import.meta.env.VITE_ML_CLIENT_ID,
        clientSecret: import.meta.env.VITE_ML_CLIENT_SECRET,
      };

      if (!config.accessToken || !config.sellerId) return [];

      const res = await fetch('/api/colecta-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data.slots ?? [];
    },
    staleTime: 30 * 60 * 1000, // 30 min — el horario no cambia mid-day
    retry: false,
  });
}
