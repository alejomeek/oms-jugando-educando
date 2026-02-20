import type { OrderStatus, OrderChannel } from './types';

// ============================================
// ESTADOS DE ÓRDENES
// ============================================

export const ORDER_STATUSES: Record<OrderStatus, { label: string; color: string }> = {
  nuevo: { label: 'Nuevo', color: 'blue' },
  preparando: { label: 'Preparando', color: 'yellow' },
  enviado: { label: 'Enviado', color: 'gray' },
  entregado: { label: 'Entregado', color: 'green' },
  cancelado: { label: 'Cancelado', color: 'red' },
};

// ============================================
// CANALES DE VENTA
// ============================================

export const CHANNELS: Record<OrderChannel, { label: string; color: string }> = {
  mercadolibre: { label: 'Mercado Libre', color: 'yellow' },
  wix: { label: 'Wix', color: 'purple' },
};
