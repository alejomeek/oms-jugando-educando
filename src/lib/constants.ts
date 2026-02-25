import type { OrderStatus, OrderChannel } from './types';

// ============================================
// TIENDAS / BODEGAS ML
// ============================================

export const ML_STORE_MAP: Record<string, string> = {
  '76644462': 'MEDELLÍN',
  '71348293': 'AVENIDA 19',
  '71843625': 'CEDI',
  '71348291': 'BULEVAR',
};

export const ML_STORE_NAMES = [...Object.values(ML_STORE_MAP), 'FULL'];

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
  falabella: { label: 'Falabella', color: '#aad63e' },
};
