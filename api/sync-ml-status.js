/**
 * Vercel Serverless Function: Sync estado 'entregado' de ML → OMS
 *
 * Consulta en Supabase las órdenes ML con logistic_type fulfillment o
 * cross_docking que NO están en estado entregado/cancelado, verifica el
 * estado del envío en la API de ML y marca como 'entregado' las que
 * ML reporta como 'delivered'.
 *
 * Solo aplica a:
 *   - fulfillment  (FULL): ML gestiona la última milla
 *   - cross_docking (Colecta): courier de ML
 *
 * NO aplica a self_service: esos los gestiona Halcon vía sync-halcon-status.
 *
 * Env vars requeridas:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   VITE_ML_ACCESS_TOKEN
 *   VITE_ML_REFRESH_TOKEN
 *   VITE_ML_CLIENT_ID
 *   VITE_ML_CLIENT_SECRET
 *   CRON_SECRET  (opcional — si está, requiere Authorization: Bearer {CRON_SECRET})
 *
 * Parámetros opcionales en el body (POST):
 *   days_back   {number}  Días hacia atrás a consultar (default: 60)
 *   dry_run     {boolean} Si true, solo reporta sin actualizar
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'Faltan variables de Supabase' });
    }

    const { days_back = 60, dry_run = false } = req.body || {};

    let accessToken = process.env.VITE_ML_ACCESS_TOKEN;
    if (!accessToken) {
        return res.status(500).json({ error: 'Falta VITE_ML_ACCESS_TOKEN' });
    }

    const dateFrom = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString();

    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors = [];

    try {
        // Todos los ML no-entregados/cancelados del período, sin importar logistic_type
        const orders = await fetchPendingOrders(dateFrom);

        for (const order of orders) {
            if (!order.shipping_id) { totalSkipped++; continue; }

            try {
                const { shipStatus, newToken } = await fetchShipmentStatus(order.shipping_id, accessToken, process.env.VITE_ML_REFRESH_TOKEN, process.env.VITE_ML_CLIENT_ID, process.env.VITE_ML_CLIENT_SECRET);

                if (newToken) accessToken = newToken;

                if (shipStatus === 'delivered') {
                    if (!dry_run) {
                        await updateStatus(order.id);
                    }
                    totalUpdated++;
                } else {
                    totalSkipped++;
                }
            } catch (e) {
                errors.push(`${order.order_id}: ${e.message}`);
            }
        }

        return res.status(200).json({
            ok: true,
            dry_run,
            days_back,
            updated: totalUpdated,
            skipped: totalSkipped,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (err) {
        console.error('sync-ml-status error:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function fetchPendingOrders(dateFrom) {
    const params = new URLSearchParams({
        channel: 'eq.mercadolibre',
        status: 'neq.entregado',
        order_date: `gte.${dateFrom}`,
        select: 'id,order_id,shipping_id',
        order: 'order_date.asc',
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${params}&status=neq.cancelado`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Range-Unit': 'items',
            Range: '0-4999',
        },
    });

    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
}

async function updateStatus(supabaseId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${supabaseId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'entregado' }),
    });
    if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}

// ─── ML API ───────────────────────────────────────────────────────────────────

async function fetchShipmentStatus(shipmentId, accessToken, refreshToken, clientId, clientSecret, retry = true) {
    const res = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401 && retry && refreshToken) {
        const newToken = await refreshMLToken(refreshToken, clientId, clientSecret);
        return fetchShipmentStatus(shipmentId, newToken, refreshToken, clientId, clientSecret, false);
    }

    if (!res.ok) throw new Error(`ML shipments ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { shipStatus: data.status, newToken: null };
}

async function refreshMLToken(refreshToken, clientId, clientSecret) {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        }),
    });
    if (!res.ok) throw new Error(`Token refresh ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.access_token;
}
