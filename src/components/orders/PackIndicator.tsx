import { Badge } from '@/components/ui/Badge';

export interface PackIndicatorProps {
  packId?: string | null;
}

/**
 * Indicador de pack para órdenes de Mercado Libre
 * Muestra un badge si la orden pertenece a un pack (múltiples órdenes, un envío)
 *
 * @example
 * <PackIndicator packId={order.pack_id} />
 */
export function PackIndicator({ packId }: PackIndicatorProps) {
  if (!packId) return null;

  return (
    <Badge color="purple">
      Pack
    </Badge>
  );
}
