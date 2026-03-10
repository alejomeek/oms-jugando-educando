import type { OrderStatus, OrderChannel } from './types';

// ============================================
// OPERADORES LOGÍSTICOS BOGOTÁ (mismo día)
// ============================================

export const normalizeStr = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const BOGOTA_STATE_NORM = new Set(['bogota d.c.', 'cundinamarca'].map(normalizeStr));

export const SANCHEZ_LOCALIDADES_NORM = new Set(
  ['Suba', 'Usaquén', 'Fontibón', 'Engativá', 'Barrios Unidos', 'Teusaquillo', 'Chapinero'].map(normalizeStr)
);

export const GGGO_LOCALIDADES_NORM = new Set(
  ['Santa Fe', 'San Cristóbal', 'La Candelaria', 'Kennedy', 'Tunjuelito', 'Los Mártires',
    'Bosa', 'Antonio Nariño', 'Rafael Uribe Uribe', 'Puente Aranda', 'Soacha', 'Ciudad Bolívar', 'Usme'].map(normalizeStr)
);

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
