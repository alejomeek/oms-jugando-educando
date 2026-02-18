/**
 * Vercel Serverless Function: Sincronizar órdenes de Wix
 * Reemplaza el endpoint POST /api/sync-wix del servidor Express local
 */

import axios from 'axios';

// ============================================
// UTILIDADES
// ============================================

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

// ============================================
// HANDLER PRINCIPAL (Vercel Serverless)
// ============================================

export default async function handler(req, res) {
    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        const normalizedOrders = orders.map(normalizeWixOrder);

        return res.json({
            success: true,
            orders: normalizedOrders,
            total: orders.length,
            nextCursor,
            hasMore: !!nextCursor,
        });

    } catch (error) {
        console.error('❌ [WIX] Error en sincronización:', error.message);

        return res.status(500).json({
            error: 'Error al sincronizar Wix',
            message: error.message,
            details: error.response?.data || null,
        });
    }
}
