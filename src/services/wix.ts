import type { WixOrder } from '@/lib/types';

/**
 * Configuración para el servicio de Wix
 */
export interface WixConfig {
  apiKey: string;
  siteId: string;
}

/**
 * Response de la API de Wix con metadatos de paginación
 */
interface WixOrdersResponse {
  orders: WixOrder[];
  nextCursor?: string;
}

/**
 * Obtiene órdenes de Wix eCommerce
 * Maneja paginación con cursor
 *
 * @param config - Configuración de Wix con API key y site ID
 * @param limit - Cantidad de órdenes a obtener (máximo 50)
 * @param cursor - Cursor para paginación (opcional)
 * @returns Objeto con array de órdenes y cursor para siguiente página
 *
 * @example
 * const { orders, nextCursor } = await fetchWixOrders(config, 50);
 * // Para obtener siguiente página:
 * const nextPage = await fetchWixOrders(config, 50, nextCursor);
 */
export async function fetchWixOrders(
  config: WixConfig,
  limit: number = 50,
  cursor?: string | null
): Promise<WixOrdersResponse> {
  const response = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
    method: 'POST',
    headers: {
      Authorization: config.apiKey,
      'wix-site-id': config.siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search: {
        cursorPaging: {
          limit,
          cursor: cursor || undefined,
        },
      },
    }),
  });

  if (response.status === 401) {
    throw new Error('API key de Wix inválido o expirado. Verifica tu configuración.');
  }

  if (response.status === 500) {
    throw new Error('Error del servidor de Wix. Intenta nuevamente en unos segundos.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Error al obtener órdenes de Wix: ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();

  return {
    orders: data.orders || [],
    nextCursor: data.pagingMetadata?.cursor,
  };
}
