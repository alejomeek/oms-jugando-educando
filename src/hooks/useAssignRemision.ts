import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';
import { reconSupabase } from '@/services/reconciliationSupabase';
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
      // Si la orden tiene subOrders (pack agrupado), usarlos siempre —
      // incluso si solo hay 1 visible — porque el pack tiene order_id = pack_id,
      // no el order_id real de la sub-orden.
      const ordersToProcess = (order.subOrders?.length ?? 0) > 0
        ? order.subOrders!
        : [order];

      const mlOrderIds = ordersToProcess.map(o => o.order_id);

      // 1. Actualizar OMS orders (única fuente de verdad)
      const { error: omsError } = await supabase
        .from('orders')
        .update({ remision_tbc: remision, fecha_remision_tbc: fecha })
        .in('order_id', mlOrderIds);

      if (omsError) throw new Error(`Error OMS: ${omsError.message}`);

      // 2. Escribir también en meli_reconciliation (para que la app Streamlit
      //    refleje la remisión automáticamente sin necesidad de re-sincronizar)
      if (reconSupabase) {
        const upserts = mlOrderIds.map(order_id => ({
          order_id,
          remision,
          fecha_remision: fecha,
          usuario: 'OMS',
        }));

        const { error: reconError } = await reconSupabase
          .from('ml_orders')
          .upsert(upserts, { onConflict: 'order_id' });

        // No lanzar error fatal — el OMS ya guardó correctamente.
        // Solo loguear para debugging.
        if (reconError) {
          console.warn('Error actualizando meli_reconciliation:', reconError.message);
        }
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
