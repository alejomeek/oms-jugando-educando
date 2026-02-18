import type { MLOrder } from '@/lib/types';

/**
 * Configuración para el servicio de Mercado Libre
 */
export interface MLConfig {
  accessToken: string;
  refreshToken: string;
  sellerId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Obtiene órdenes de Mercado Libre
 * Maneja automáticamente el refresh de token si expira (401)
 *
 * @param config - Configuración de ML con tokens y credenciales
 * @param limit - Cantidad de órdenes a obtener (máximo 50)
 * @param offset - Offset para paginación
 * @returns Array de órdenes de Mercado Libre
 *
 * @example
 * const orders = await fetchMLOrders(config, 50, 0);
 */
export async function fetchMLOrders(
  config: MLConfig,
  limit: number = 50,
  offset: number = 0
): Promise<MLOrder[]> {
  const params = new URLSearchParams({
    seller: config.sellerId,
    sort: 'date_desc',
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `https://api.mercadolibre.com/orders/search?${params}`,
    { headers: { Authorization: `Bearer ${config.accessToken}` } }
  );

  // Si es 401, intentar refresh del token
  if (response.status === 401) {
    console.log('Token expirado, intentando refresh...');
    const newToken = await refreshMLToken(config);
    console.log('Reintentando request con nuevo token...');
    return fetchMLOrders({ ...config, accessToken: newToken }, limit, offset);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Error al obtener órdenes de Mercado Libre: ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Refresca el access token de Mercado Libre usando el refresh token
 *
 * @param config - Configuración de ML con refresh token y credenciales
 * @returns Nuevo access token
 *
 * @example
 * const newAccessToken = await refreshMLToken(config);
 */
export async function refreshMLToken(config: MLConfig): Promise<string> {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Error al refrescar token de Mercado Libre: ${errorData.message || response.statusText}. Verifica tus credenciales.`
    );
  }

  const data = await response.json();

  console.log('Token refreshed successfully');
  console.warn('IMPORTANTE: Actualizar tokens en el storage:', {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });

  return data.access_token;
}
