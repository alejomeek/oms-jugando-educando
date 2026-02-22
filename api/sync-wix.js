/**
 * Vercel Serverless Function: Sincronizar órdenes de Wix
 */

// ============================================
// UTILIDADES
// ============================================

function normalizeWixOrder(wixOrder) {
    return {
        order_id: wixOrder.number,
        channel: 'wix',
        pack_id: null,
        shipping_id: null,
        status: wixOrder.status === 'CANCELED'
            ? 'cancelado'
            : wixOrder.fulfillmentStatus === 'FULFILLED'
                ? 'entregado'
                : 'nuevo',
        order_date: wixOrder.createdDate || wixOrder._createdDate || new Date().toISOString(),
        closed_date: wixOrder.updatedDate || wixOrder._updatedDate || wixOrder.createdDate || wixOrder._createdDate || null,
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
        shipping_address: (() => {
            const dest = wixOrder.shippingInfo?.logistics?.shippingDestination;
            const addr = dest?.address ?? wixOrder.recipientInfo?.address;
            const contact = dest?.contactDetails ?? wixOrder.recipientInfo?.contactDetails;
            if (!addr) return null;
            return {
                street: [addr.addressLine, addr.addressLine2].filter(Boolean).join(', '),
                city: addr.city || '',
                state: addr.subdivisionFullname || addr.subdivision || '',
                country: addr.countryFullname || addr.country || '',
                zipCode: addr.postalCode || '',
                receiverName: contact ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : undefined,
                receiverPhone: contact?.phone,
            };
        })(),
        items: wixOrder.lineItems.map((item) => ({
            sku: item.physicalProperties?.sku || item.sku || item.id,
            title:
                item.productName?.translated ||
                item.productName?.original ||
                'Sin nombre',
            quantity: item.quantity,
            unitPrice: parseFloat(item.price?.amount || item.price || 0),
            fullPrice: parseFloat(item.totalPriceAfterTax?.amount || item.totalPrice?.amount || item.price?.amount || 0),
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
        const { config, limit = 50, cursor = null, dateFrom } = req.body;

        // Validar config
        if (!config?.apiKey || !config?.siteId) {
            return res.status(400).json({ error: 'Faltan credenciales de Wix' });
        }

        console.log(`📡 [WIX] Obteniendo órdenes...${dateFrom ? ` (Desde: ${dateFrom.split('T')[0]})` : ''}`);

        const allOrders = [];
        let currentCursor = cursor || undefined;
        let keepGoing = true;

        while (keepGoing) {
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
                            cursor: currentCursor,
                        },
                        // Sin filtro de paymentStatus: incluye PAID, UNPAID (transferencia,
                        // link de pago, etc.) y cualquier otro medio de pago
                        sort: [{ fieldName: 'createdDate', order: 'DESC' }],
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error de Wix API (${response.status}): ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const orders = data.orders || [];

            // Filtrar y detener si encontramos órdenes más antiguas que dateFrom
            if (dateFrom) {
                const inRange = orders.filter(o => {
                    const d = o.createdDate || o._createdDate;
                    return d && d >= dateFrom;
                });
                allOrders.push(...inRange);

                // Si encontramos menos órdenes en rango que el total de la página,
                // significa que ya llegamos al límite de fecha antigua
                if (inRange.length < orders.length) {
                    keepGoing = false;
                    break;
                }
            } else {
                allOrders.push(...orders);
            }

            currentCursor = data.metadata?.cursors?.next || null;

            if (!currentCursor || !data.metadata?.hasNext) {
                keepGoing = false;
            } else if (allOrders.length >= 1000) {
                console.warn(`⏳ [WIX] Límite de seguridad alcanzado (1000 órdenes).`);
                keepGoing = false;
            }
        }

        console.log(`✅ [WIX] ${allOrders.length} órdenes obtenidas`);

        const normalizedOrders = allOrders.map(normalizeWixOrder);

        return res.json({
            success: true,
            orders: normalizedOrders,
            total: allOrders.length,
            nextCursor: currentCursor,
            hasMore: !!currentCursor,
        });

    } catch (error) {
        console.error('❌ [WIX] Error en sincronización:', error.message);

        return res.status(500).json({
            error: 'Error al sincronizar Wix',
            message: error.message,
        });
    }
}
