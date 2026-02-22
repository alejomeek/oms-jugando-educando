/**
 * Vercel Serverless Function: Sincronizar órdenes de Mercado Libre
 */

// ============================================
// UTILIDADES
// ============================================

const ML_STORE_MAP = {
    '76644462': 'MEDELLÍN',
    '71348293': 'AVENIDA 19',
    '71843625': 'CEDI',
    '71348291': 'BULEVAR',
};

/**
 * Convierte los estados de ML al estado OMS.
 * mlOrderStatus: estado de la orden (paid, cancelled…)
 * shipmentStatus: estado del envío (shipped, delivered, cancelled…)
 *
 * El estado del envío tiene precedencia sobre el de la orden,
 * excepto cuando la orden está cancelada.
 */
function mapMLStatus(mlOrderStatus, shipmentStatus, shipmentSubstatus) {
    if (mlOrderStatus === 'cancelled') return 'cancelado';

    switch (shipmentStatus) {
        case 'delivered':    return 'entregado';
        case 'shipped':      return 'enviado';
        case 'cancelled':
        case 'returned':     return 'cancelado';
        case 'handling':     return 'preparando';
        case 'ready_to_ship':
            // ready_to_print = sin imprimir aún, no se ha hecho nada → nuevo
            // cualquier otro substatus = ya hubo acción (impreso, empacado, courier asignado…) → preparando
            return shipmentSubstatus === 'ready_to_print' ? 'nuevo' : 'preparando';
        default:             return 'nuevo';
    }
}

function normalizeMLOrder(mlOrder) {
    const rawStoreId = mlOrder.order_items[0]?.stock?.store_id?.toString() || null;
    const storeName = rawStoreId ? (ML_STORE_MAP[rawStoreId] || null) : null;
    // El status inicial se basa en el nivel de orden; se refinará con el shipment
    const initialStatus = mlOrder.status === 'cancelled' ? 'cancelado' : 'nuevo';

    return {
        order_id: mlOrder.id.toString(),
        channel: 'mercadolibre',
        pack_id: mlOrder.pack_id?.toString() || null,
        shipping_id: mlOrder.shipping?.id?.toString() || null,
        status: initialStatus,
        _mlOrderStatus: mlOrder.status, // campo temporal para usar en el loop
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
        store_id: rawStoreId,
        store_name: storeName,
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
 * Obtiene la dirección de entrega de un envío de ML.
 * Endpoint: GET /shipments/{id}
 */
async function fetchMLShipmentData(accessToken, shipmentId) {
    try {
        const response = await fetch(
            `https://api.mercadolibre.com/shipments/${shipmentId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!response.ok) return { address: null, logistic_type: null, shipment_status: null };
        const data = await response.json();
        const addr = data.receiver_address;
        const address = addr ? {
            street: [addr.street_name, addr.street_number].filter(Boolean).join(' '),
            comment: addr.comment || undefined,
            neighborhood: addr.neighborhood?.name || undefined,
            city: addr.city?.name || '',
            state: addr.state?.name || '',
            country: addr.country?.name || addr.country_id || '',
            zipCode: addr.zip_code || '',
            receiverName: addr.receiver_name || undefined,
            receiverPhone: addr.receiver_phone || undefined,
            latitude: addr.latitude || undefined,
            longitude: addr.longitude || undefined,
        } : null;
        return { address, logistic_type: data.logistic_type || null, shipment_status: data.status || null, shipment_substatus: data.substatus || null };
    } catch {
        return { address: null, logistic_type: null, shipment_status: null, shipment_substatus: null };
    }
}

async function fetchMLOrders(accessToken, sellerId, limit, offset, dateFrom, dateTo) {
    const params = new URLSearchParams({
        seller: sellerId,
        sort: 'date_desc',
        limit: String(limit),
        offset: String(offset),
    });

    if (dateFrom) params.append('order.date_created.from', dateFrom);
    if (dateTo) params.append('order.date_created.to', dateTo);

    const response = await fetch(
        `https://api.mercadolibre.com/orders/search?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return { response, data: await response.json() };
}

async function refreshMLToken(config) {
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
        throw new Error(`Error al refrescar token ML: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
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

    console.log('\n🟡 [ML] Iniciando sincronización de Mercado Libre...');

    try {
        const { config, limit = 50, offset = 0, dateFrom, dateTo } = req.body;

        // Validar config
        if (!config?.accessToken || !config?.sellerId) {
            return res.status(400).json({ error: 'Faltan credenciales de Mercado Libre' });
        }

        console.log(`📡 [ML] Obteniendo órdenes...${dateFrom ? ` (Desde: ${dateFrom.split('T')[0]})` : ''}`);

        // Necesitamos fetch iterativo como en sync-incremental.
        let accessToken = config.accessToken;
        let newTokens = null;
        const allOrders = [];
        let currentOffset = offset;
        let keepGoing = true;

        while (keepGoing) {
            let { response, data } = await fetchMLOrders(accessToken, config.sellerId, limit, currentOffset, dateFrom, dateTo);

            // Si es 401, refrescar token y reintentar
            if (response.status === 401) {
                console.log('⚠️  [ML] Token expirado, intentando refresh...');
                newTokens = await refreshMLToken(config);
                accessToken = newTokens.accessToken;

                console.log('📡 [ML] Reintentando con nuevo token...');
                ({ response, data } = await fetchMLOrders(accessToken, config.sellerId, limit, currentOffset, dateFrom, dateTo));
            }

            if (!response.ok) {
                throw new Error(`Error de ML API: ${data.message || response.statusText}`);
            }

            const orders = data.results || [];
            allOrders.push(...orders);

            if (orders.length < limit) {
                keepGoing = false; // No hay más páginas
            } else {
                currentOffset += limit; // Siguiente página

                // Si llegamos a un límite de seguridad para evitar timeouts en Serverless
                if (allOrders.length >= 1000) {
                    console.warn(`⏳ [ML] Límite de seguridad alcanzado (1000 órdenes).`);
                    keepGoing = false;
                }
            }
        }

        console.log(`✅ [ML] ${allOrders.length} órdenes obtenidas (Histórico parcial/reciente)`);

        // Normalizar y enriquecer con dirección de envío en paralelo
        const normalizedOrders = await Promise.all(
            allOrders.map(async (order) => {
                const normalized = normalizeMLOrder(order);
                if (normalized.shipping_id) {
                    const { address, logistic_type, shipment_status, shipment_substatus } = await fetchMLShipmentData(
                        accessToken,
                        normalized.shipping_id
                    );
                    normalized.shipping_address = address;
                    normalized.logistic_type = logistic_type;
                    normalized.status = mapMLStatus(normalized._mlOrderStatus, shipment_status, shipment_substatus);
                    // FULL: stock gestionado por ML, no tiene store propia
                    if (logistic_type === 'fulfillment' && !normalized.store_id) {
                        normalized.store_name = 'FULL';
                        normalized.store_id = 'full';
                    }
                } else {
                    // Sin envío: el status solo depende del estado de la orden
                    normalized.status = mapMLStatus(normalized._mlOrderStatus, null);
                }
                delete normalized._mlOrderStatus;
                return normalized;
            })
        );

        return res.json({
            success: true,
            orders: normalizedOrders,
            total: allOrders.length,
            newTokens,
        });

    } catch (error) {
        console.error('❌ [ML] Error en sincronización:', error.message);

        return res.status(500).json({
            error: 'Error al sincronizar Mercado Libre',
            message: error.message,
        });
    }
}
