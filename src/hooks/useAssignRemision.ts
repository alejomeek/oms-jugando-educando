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
      // Si la orden tiene subOrders (pack agrupado), usarlos siempre —
      // incluso si solo hay 1 visible — porque el pack tiene order_id = pack_id,
      // no el order_id real de la sub-orden.
      const ordersToProcess = (order.subOrders?.length ?? 0) > 0
        ? order.subOrders!
        : [order];

      const mlOrderIds = ordersToProcess.map(o => o.order_id);

      // 1. Actualizar OMS orders
      const { error: omsError } = await supabase
        .from('orders')
        .update({ remision_tbc: remision, fecha_remision_tbc: fecha })
        .in('order_id', mlOrderIds);

      if (omsError) throw new Error(`Error OMS: ${omsError.message}`);

      // 2. Upsert completo en meli_reconciliation con todos los datos de la orden.
      //    Así funciona aunque el usuario nunca haya abierto la app Streamlit.
      const recon = getReconSupabase();
      const results = await Promise.all(
        ordersToProcess.map(o => {
          const productos = o.items.map(item => ({
            sku: item.sku,
            titulo: item.title,
            cantidad: item.quantity,
            precio_unitario: item.unitPrice,
          }));

          return recon.from('ml_orders').upsert(
            {
              order_id: o.order_id,
              pack_id: o.pack_id ?? null,
              shipping_id: o.shipping_id ?? null,
              fecha_orden: o.order_date,
              total: o.total_amount,
              productos: JSON.stringify(productos),
              buyer_nickname: o.customer.nickname ?? null,
              remision,
              fecha_remision: fecha,
              usuario: 'OMS',
            },
            { onConflict: 'order_id' },
          );
        }),
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
