/**
 * Vercel Serverless Function: Migrar pedido al sistema Halcon
 *
 * Recibe un pedido del OMS, lo transforma al formato de Halcon y llama
 * al endpoint /api/recibir-pedido del proyecto Halcon (flex-tracker).
 *
 * Pedidos elegibles:
 *   - Canal Wix (cualquier logistic_type)
 *   - Canal Mercado Libre con logistic_type: 'cross_docking' | 'self_service'
 *
 * Env vars requeridas:
 *   HALCON_API_URL          - URL completa del endpoint de Halcon
 *                             ej: https://halcon.vercel.app/api/recibir-pedido
 *   HALCON_WEBHOOK_SECRET   - Secret compartido con Halcon para autenticar
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { order } = req.body || {};
    if (!order) {
        return res.status(400).json({ error: 'Falta el objeto order en el body' });
    }

    const halconUrl = process.env.HALCON_API_URL;
    const secret = process.env.HALCON_WEBHOOK_SECRET;

    if (!halconUrl || !secret) {
        return res.status(500).json({ error: 'HALCON_API_URL o HALCON_WEBHOOK_SECRET no configurados' });
    }

    // Validar elegibilidad
    const isWix = order.channel === 'wix';
    const isMLSelfManaged =
        order.channel === 'mercadolibre' &&
        (order.logistic_type === 'cross_docking' || order.logistic_type === 'self_service');

    if (!isWix && !isMLSelfManaged) {
        return res.status(400).json({
            error: 'Pedido no elegible: solo Wix o ML cross_docking/self_service',
        });
    }

    // Mapear campos OMS → Halcon
    const shipping = order.shipping_address || {};
    const customer = order.customer || {};

    const destinatario =
        shipping.receiverName ||
        (customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.nickname || customer.email || 'Sin nombre');

    const celular = shipping.receiverPhone || '';

    const direccion = shipping.comment
        ? `${shipping.street || ''}, ${shipping.comment}`
        : shipping.street || '';

    const ciudad = shipping.city || '';

    let origen, numero_envio, numero_pedido_wix;

    if (isWix) {
        origen = 'wix';
        numero_envio = `WIX-${order.order_id}`;
        numero_pedido_wix = order.order_id;
    } else {
        // ML cross_docking / self_service
        origen = 'mercadolibre';
        numero_envio = `ML-${order.order_id}`;
        numero_pedido_wix = order.order_id;
    }

    const pedido = {
        origen,
        numero_envio,
        numero_pedido_wix,
        destinatario,
        celular,
        direccion,
        ciudad,
    };

    try {
        const halconRes = await fetch(halconUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, pedido }),
        });

        const data = await halconRes.json();

        if (!halconRes.ok) {
            console.error('Error respuesta Halcon:', data);
            return res.status(halconRes.status).json({ error: data.error || 'Error en Halcon', details: data });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error llamando a Halcon:', error);
        return res.status(500).json({ error: error.message });
    }
}
