/**
 * Vercel Serverless Function: Migrar pedido al sistema Halcon
 *
 * Pedidos elegibles:
 *   - Canal Wix (cualquier logistic_type)
 *   - Canal Mercado Libre con logistic_type: 'self_service'
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

    if (!halconUrl) {
        return res.status(500).json({ error: 'Variable HALCON_API_URL no configurada en Vercel' });
    }
    if (!secret) {
        return res.status(500).json({ error: 'Variable HALCON_WEBHOOK_SECRET no configurada en Vercel' });
    }

    // Validar elegibilidad
    const isWix = order.channel === 'wix';
    const isMLSelfService =
        order.channel === 'mercadolibre' && order.logistic_type === 'self_service';

    if (!isWix && !isMLSelfService) {
        return res.status(400).json({
            error: 'Pedido no elegible: solo Wix o ML self_service',
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

    const origen = isWix ? 'wix' : 'mercadolibre';
    const numero_envio = isWix ? `WIX-${order.order_id}` : `ML-${order.order_id}`;
    const numero_pedido_wix = order.order_id;

    const pedido = { origen, numero_envio, numero_pedido_wix, destinatario, celular, direccion, ciudad };

    try {
        const halconRes = await fetch(halconUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, pedido }),
        });

        let data;
        const contentType = halconRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await halconRes.json();
        } else {
            const text = await halconRes.text();
            data = { raw: text };
        }

        if (!halconRes.ok) {
            console.error('Error respuesta Halcon:', halconRes.status, data);
            return res.status(halconRes.status).json({
                error: data.error || `Halcon respondió con status ${halconRes.status}`,
                details: data,
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error llamando a Halcon:', error);
        return res.status(500).json({
            error: `No se pudo conectar con Halcon: ${error.message}`,
            halcon_url: halconUrl,
        });
    }
}
