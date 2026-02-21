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
      const isPack = (order.subOrders?.length ?? 0) > 1;

      // IDs internos del OMS (UUIDs) para actualizar la tabla orders
      const internalIds = isPack
        ? order.subOrders!.map(s => s.id)
        : [order.id];

      // IDs de ML (string) para actualizar ml_orders en meli_reconciliation
      const mlOrderIds = isPack
        ? order.subOrders!.map(s => s.order_id)
        : [order.order_id];

      // 1. Actualizar OMS orders
      const { error: omsError } = await supabase
        .from('orders')
        .update({ remision_tbc: remision, fecha_remision_tbc: fecha })
        .in('id', internalIds);

      if (omsError) throw new Error(`Error OMS: ${omsError.message}`);

      // 2. Upsert en meli_reconciliation ml_orders (crea la orden si no existe)
      const results = await Promise.all(
        mlOrderIds.map(order_id =>
          reconSupabase
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
