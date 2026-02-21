import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';
import { getReconSupabase } from '@/services/reconciliationSupabase';
import type { Order } from '@/lib/types';

interface AssignRemisionParams {
  order: Order;
  remision: string;
  fecha: string; // YYYY-MM-DD
}

export function useAssignRemision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ order, remision, fecha }: AssignRemisionParams) => {
      const isPack = (order.subOrders?.length ?? 0) > 1;

      // IDs de ML (string) para filtrar en ambas DBs
      const mlOrderIds = isPack
        ? order.subOrders!.map(s => s.order_id)
        : [order.order_id];

      // 1. Actualizar OMS orders (filtrar por order_id, no por id,
      //    porque los packs agrupados usan pack_id como id en el frontend)
      const { error: omsError } = await supabase
        .from('orders')
        .update({ remision_tbc: remision, fecha_remision_tbc: fecha })
        .in('order_id', mlOrderIds);

      if (omsError) throw new Error(`Error OMS: ${omsError.message}`);

      // 2. Upsert en meli_reconciliation ml_orders (crea la orden si no existe)
      const recon = getReconSupabase();
      const results = await Promise.all(
        mlOrderIds.map(order_id =>
          recon
            .from('ml_orders')
            .upsert(
              { order_id, remision, fecha_remision: fecha, usuario: 'OMS' },
              { onConflict: 'order_id' },
            ),
        ),
      );

      const reconError = results.find(r => r.error);
      if (reconError?.error) {
        throw new Error(`Error reconciliación: ${reconError.error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Remisión guardada');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al guardar remisión');
    },
  });
}
