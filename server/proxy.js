/**
 * Servidor Proxy para APIs de Mercado Libre y Wix
 * Evita errores de CORS ejecutándose en el backend
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));
app.use(express.json());

// ============================================
// UTILIDADES
// ============================================

/**
 * Normaliza una orden de Mercado Libre al formato unificado
 */
function normalizeMLOrder(mlOrder) {
  return {
    external_id: mlOrder.id.toString(),
    channel: 'mercadolibre',
    pack_id: mlOrder.pack_id?.toString() || null,
    shipping_id: mlOrder.shipping?.id?.toString() || null,
    status: 'nuevo',
    order_date: mlOrder.date_created,
    closed_date: mlOrder.date_closed || null,
    total_amount: mlOrder.total_amount,
    paid_amount: mlOrder.paid_amount,
    currency: mlOrder.currency_id,
    customer: {
      source: 'mercadolibre',
      id: mlOrder.buyer.id.toString(),
      nickname: mlOrder.buyer.nickname,
    },
    shipping_address: null,
    items: mlOrder.order_items.map((item) => ({
      sku: item.item.seller_sku,
      title: item.item.title,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      fullPrice: item.full_unit_price,
      currency: item.currency_id,
      variationAttributes:
        item.item.variation_attributes?.map((attr) => ({
          name: attr.name,
          value: attr.value_name,
        })) || [],
    })),
    payment_info: mlOrder.payments?.[0]
      ? {
        method: mlOrder.payments[0].payment_method_id,
        status: mlOrder.payments[0].status,
        installments: mlOrder.payments[0].installments,
        paidAmount: mlOrder.payments[0].total_paid_amount,
        paymentDate: mlOrder.payments[0].date_approved,
      }
      : null,
    tags: mlOrder.tags || [],
    notes: null,
  };
}

/**
 * Normaliza una orden de Wix al formato unificado
 */
function normalizeWixOrder(wixOrder) {
  return {
    external_id: wixOrder.number,
    channel: 'wix',
    pack_id: null,
    shipping_id: null,
    status: 'nuevo',
    order_date: wixOrder._createdDate || wixOrder.dateCreated || new Date().toISOString(),
    closed_date: wixOrder._updatedDate || wixOrder.dateUpdated || wixOrder._createdDate || null,
    total_amount: parseFloat(wixOrder.priceSummary.total?.amount || wixOrder.priceSummary.total || 0),
    paid_amount: parseFloat(wixOrder.priceSummary.total?.amount || wixOrder.priceSummary.total || 0),
    currency: wixOrder.currency,
    customer: {
      source: 'wix',
      id: wixOrder.buyerInfo.id,
      email: wixOrder.buyerInfo.email,
      firstName: wixOrder.billingInfo?.contactDetails?.firstName,
      lastName: wixOrder.billingInfo?.contactDetails?.lastName,
      phone: wixOrder.billingInfo?.contactDetails?.phone,
    },
    shipping_address: wixOrder.shippingInfo?.shipmentDetails?.address
      ? {
        street: wixOrder.shippingInfo.shipmentDetails.address.addressLine1 || '',
        city: wixOrder.shippingInfo.shipmentDetails.address.city || '',
        state: wixOrder.shippingInfo.shipmentDetails.address.subdivision || '',
        country: wixOrder.shippingInfo.shipmentDetails.address.country || '',
        zipCode: wixOrder.shippingInfo.shipmentDetails.address.postalCode || '',
      }
      : null,
    items: wixOrder.lineItems.map((item) => ({
      sku: item.sku || item.id,
      title:
        item.productName?.translated ||
        item.productName?.original ||
        'Sin nombre',
      quantity: item.quantity,
      unitPrice: parseFloat(item.price?.amount || item.price || 0),
      fullPrice: parseFloat(item.totalPrice?.amount || item.totalPrice || 0),
      currency: wixOrder.currency,
      imageUrl: item.image?.url,
    })),
    payment_info: {
      status: wixOrder.paymentStatus,
    },
    tags: [],
    notes: null,
  };
}

/**
 * Refresca el access token de Mercado Libre
 */
async function refreshMLToken(config) {
  console.log('🔍 DEBUG Proxy - refreshMLToken recibió:', {
    clientId: config.clientId,
    clientSecret: config.clientSecret?.substring(0, 10) + '...',
    refreshToken: config.refreshToken?.substring(0, 20) + '...',
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    hasRefreshToken: !!config.refreshToken
  });

  try {
    console.log('🔄 Refrescando token de Mercado Libre...');

    console.log('🔍 DEBUG - Request a ML OAuth:', {
      url: 'https://api.mercadolibre.com/oauth/token',
      data: {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken
      }
    });

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

    console.log('✅ Token refrescado exitosamente');

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    console.log('🔍 DEBUG - Response de ML:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    console.error('❌ Error al refrescar token:', error.response?.data || error.message);
    throw new Error('Error al refrescar token de Mercado Libre');
  }
}

// ============================================
// ENDPOINT: Sincronizar Mercado Libre
// ============================================

app.post('/api/sync-ml', async (req, res) => {
  console.log('\n🟡 [ML] Iniciando sincronización de Mercado Libre...');

  try {
    const { config, limit = 50, offset = 0 } = req.body;

    // Validar config
    if (!config?.accessToken || !config?.sellerId) {
      return res.status(400).json({
        error: 'Faltan credenciales de Mercado Libre',
      });
    }

    let accessToken = config.accessToken;
    let newTokens = null;

    // Intentar fetch de órdenes
    try {
      console.log(`📡 [ML] Obteniendo órdenes (limit: ${limit}, offset: ${offset})...`);

      const response = await axios.get('https://api.mercadolibre.com/orders/search', {
        params: {
          seller: config.sellerId,
          sort: 'date_desc',
          limit,
          offset,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const orders = response.data.results || [];
      console.log(`✅ [ML] ${orders.length} órdenes obtenidas`);

      // Normalizar órdenes
      const normalizedOrders = orders.map(normalizeMLOrder);
      console.log(`✅ [ML] Órdenes normalizadas`);

      return res.json({
        success: true,
        orders: normalizedOrders,
        total: orders.length,
        newTokens: null,
      });

    } catch (error) {
      // Si es 401, intentar refresh
      if (error.response?.status === 401) {
        console.log('⚠️  [ML] Token expirado, intentando refresh...');

        newTokens = await refreshMLToken(config);
        accessToken = newTokens.accessToken;

        // Reintentar con nuevo token
        console.log(`📡 [ML] Reintentando con nuevo token...`);

        const response = await axios.get('https://api.mercadolibre.com/orders/search', {
          params: {
            seller: config.sellerId,
            sort: 'date_desc',
            limit,
            offset,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const orders = response.data.results || [];
        console.log(`✅ [ML] ${orders.length} órdenes obtenidas con nuevo token`);

        const normalizedOrders = orders.map(normalizeMLOrder);
        console.log(`✅ [ML] Órdenes normalizadas`);

        return res.json({
          success: true,
          orders: normalizedOrders,
          total: orders.length,
          newTokens: newTokens, // Retornar nuevos tokens para actualizar en frontend
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('❌ [ML] Error en sincronización:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      error: 'Error al sincronizar Mercado Libre',
      message: error.message,
      details: error.response?.data || null,
    });
  }
});

// ============================================
// ENDPOINT: Sincronizar Wix
// ============================================

app.post('/api/sync-wix', async (req, res) => {
  console.log('\n🟢 [WIX] Iniciando sincronización de Wix...');

  try {
    const { config, limit = 50, cursor = null } = req.body;

    // Validar config
    if (!config?.apiKey || !config?.siteId) {
      return res.status(400).json({
        error: 'Faltan credenciales de Wix',
      });
    }

    console.log(`📡 [WIX] Obteniendo órdenes (limit: ${limit})...`);

    const response = await axios.post(
      'https://www.wixapis.com/ecom/v1/orders/search',
      {
        search: {
          cursorPaging: {
            limit,
            cursor: cursor || undefined,
          },
        },
      },
      {
        headers: {
          Authorization: config.apiKey,
          'wix-site-id': config.siteId,
          'Content-Type': 'application/json',
        },
      }
    );

    const orders = response.data.orders || [];
    const nextCursor = response.data.pagingMetadata?.cursor;

    console.log(`✅ [WIX] ${orders.length} órdenes obtenidas`);

    // Normalizar órdenes
    const normalizedOrders = orders.map(normalizeWixOrder);
    console.log(`✅ [WIX] Órdenes normalizadas`);

    res.json({
      success: true,
      orders: normalizedOrders,
      total: orders.length,
      nextCursor: nextCursor,
      hasMore: !!nextCursor,
    });

  } catch (error) {
    console.error('❌ [WIX] Error en sincronización:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      error: 'Error al sincronizar Wix',
      message: error.message,
      details: error.response?.data || null,
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server running' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('\n🚀 Servidor Proxy iniciado');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🔗 Endpoints disponibles:`);
  console.log(`   - POST http://localhost:${PORT}/api/sync-ml`);
  console.log(`   - POST http://localhost:${PORT}/api/sync-wix`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log('\n✅ Listo para recibir requests\n');
});
