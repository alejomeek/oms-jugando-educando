/**
 * Vercel Serverless Function: Sincronizar órdenes de Mercado Libre
 * Reemplaza el endpoint POST /api/sync-ml del servidor Express local
 */

import axios from 'axios';

// ============================================
// UTILIDADES
// ============================================

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

async function refreshMLToken(config) {
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

    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
    };
}

// ============================================
// HANDLER PRINCIPAL (Vercel Serverless)
// ============================================

export default async function handler(req, res) {
    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // CORS para producción
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

            const normalizedOrders = orders.map(normalizeMLOrder);

            return res.json({
                success: true,
                orders: normalizedOrders,
                total: orders.length,
                newTokens: null,
            });

        } catch (error) {
            // Si es 401, intentar refresh del token
            if (error.response?.status === 401) {
                console.log('⚠️  [ML] Token expirado, intentando refresh...');

                newTokens = await refreshMLToken(config);
                accessToken = newTokens.accessToken;

                console.log('📡 [ML] Reintentando con nuevo token...');

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

                return res.json({
                    success: true,
                    orders: normalizedOrders,
                    total: orders.length,
                    newTokens,
                });
            }

            throw error;
        }

    } catch (error) {
        console.error('❌ [ML] Error en sincronización:', error.message);

        return res.status(500).json({
            error: 'Error al sincronizar Mercado Libre',
            message: error.message,
            details: error.response?.data || null,
        });
    }
}
