import axios from 'axios';
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
  try {
    const response = await axios.get('https://api.mercadolibre.com/orders/search', {
      params: {
        seller: config.sellerId,
        sort: 'date_desc',
        limit,
        offset,
      },
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    return response.data.results || [];
  } catch (error: any) {
    // Si es 401, intentar refresh del token
    if (error.response?.status === 401) {
      console.log('Token expirado, intentando refresh...');
      const newToken = await refreshMLToken(config);

      // Reintentar con nuevo token
      console.log('Reintentando request con nuevo token...');
      return fetchMLOrders(
        { ...config, accessToken: newToken },
        limit,
        offset
      );
    }

    // Para otros errores, re-throw
    console.error('Error fetching ML orders:', error.response?.data || error.message);
    throw new Error(
      `Error al obtener órdenes de Mercado Libre: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

/**
 * Refresca el access token de Mercado Libre usando el refresh token
 *
 * @param config - Configuración de ML con refresh token y credenciales
 * @returns Nuevo access token
 *
 * @example
 * const newAccessToken = await refreshMLToken(config);
 * // Actualizar token en localStorage o estado global
 */
export async function refreshMLToken(config: MLConfig): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    console.log('Token refreshed successfully');

    // TODO: Guardar nuevos tokens en localStorage o estado global
    // localStorage.setItem('ml_access_token', newAccessToken);
    // localStorage.setItem('ml_refresh_token', newRefreshToken);

    // Por ahora, solo logueamos que se debe actualizar
    console.warn('IMPORTANTE: Actualizar tokens en el storage:', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: response.data.expires_in,
    });

    return newAccessToken;
  } catch (error: any) {
    console.error('Error refreshing ML token:', error.response?.data || error.message);
    throw new Error(
      `Error al refrescar token de Mercado Libre: ${
        error.response?.data?.message || error.message
      }. Verifica tus credenciales.`
    );
  }
}
