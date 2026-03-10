import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

/**
 * Asigna (o limpia) el operador manual de una orden.
 * Valores válidos: 'sanchez' | 'gggo' | 'juan' | null (auto)
 *
 * En Bulevar: usado para mover órdenes entre GG Go y Sánchez (Halcón)
 *   cuando la clasificación automática por localidad no es correcta.
 * En Medellín: usado para asignar órdenes flex a Juan o GG Go.
 */
export function useAssignOperator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      operator,
    }: {
      orderId: string;
      operator: string | null;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ assigned_operator: operator })
        .eq('id', orderId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-orders-today'] });
    },
  });
}
