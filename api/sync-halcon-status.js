/**
 * Vercel Serverless Function: Sync estado 'entregado' de Halcon → OMS
 *
 * Consulta pedidos_wix y pedidos_flex de Firestore donde:
 *   - estado = 'entregado'
 *   - fecha_entrega >= (ahora - LOOKBACK_MINUTES)
 *
 * Luego actualiza el status en Supabase a 'entregado'.
 * Es idempotente: omite pedidos que ya están entregados en OMS.
 *
 * Invocado desde Halcon mobile al marcar un pedido como entregado.
 * También puede llamarse manualmente desde curl/Postman.
 *
 * Auth: Si CRON_SECRET está configurado, requiere Authorization: Bearer {CRON_SECRET}.
 *       Si no está configurado, el endpoint es abierto.
 *
 * Env vars requeridas en Vercel:
 *   HALCON_FIREBASE_API_KEY     - API key de Firebase (proyecto flex-tracker)
 *   HALCON_FIREBASE_PROJECT_ID  - Project ID de Firebase
 *   VITE_SUPABASE_URL           - URL de Supabase
 *   VITE_SUPABASE_ANON_KEY      - Anon key de Supabase
 */

const FIREBASE_API_KEY = process.env.HALCON_FIREBASE_API_KEY;
const PROJECT_ID = process.env.HALCON_FIREBASE_PROJECT_ID;
const QUERY_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;

export default async function handler(req, res) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!FIREBASE_API_KEY || !PROJECT_ID) {
        return res.status(500).json({ error: 'Faltan variables HALCON_FIREBASE_API_KEY o HALCON_FIREBASE_PROJECT_ID' });
    }

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY' });
    }

    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors = [];

    try {
        // ── pedidos_wix ───────────────────────────────────────────────────────
        const wixPedidos = await queryEntregados('pedidos_wix');

        for (const fields of wixPedidos) {
            const numeroPedidoWix = fields.numero_pedido_wix?.stringValue;
            if (!numeroPedidoWix) { totalSkipped++; continue; }

            try {
                const updated = await updateOmsStatus(supabaseUrl, supabaseKey, {
                    filter: { order_id: `eq.${numeroPedidoWix}` },
                    channel: 'wix',
                });
                updated.length > 0 ? totalUpdated += updated.length : totalSkipped++;
            } catch (e) {
                errors.push(`Wix #${numeroPedidoWix}: ${e.message}`);
            }
        }

        // ── pedidos_flex ──────────────────────────────────────────────────────
        const flexPedidos = await queryEntregados('pedidos_flex');

        for (const fields of flexPedidos) {
            const numeroEnvio = fields.numero_envio?.stringValue;
            if (!numeroEnvio) { totalSkipped++; continue; }

            try {
                const updated = await updateOmsStatus(supabaseUrl, supabaseKey, {
                    filter: { shipping_id: `eq.${numeroEnvio}` },
                    channel: 'mercadolibre',
                });
                updated.length > 0 ? totalUpdated += updated.length : totalSkipped++;
            } catch (e) {
                errors.push(`ML shipping ${numeroEnvio}: ${e.message}`);
            }
        }

        return res.status(200).json({
            ok: true,
            wix_encontrados: wixPedidos.length,
            flex_encontrados: flexPedidos.length,
            updated: totalUpdated,
            skipped: totalSkipped,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (err) {
        console.error('sync-halcon-status error:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
}

// ─── Firestore ────────────────────────────────────────────────────────────────

async function queryEntregados(collectionId) {
    const res = await fetch(QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'estado' },
                        op: 'EQUAL',
                        value: { stringValue: 'entregado' },
                    },
                },
            },
        }),
    });

    if (!res.ok) throw new Error(`Firestore error en ${collectionId} (${res.status}): ${await res.text()}`);

    const rows = await res.json();
    return rows.filter(r => r.document).map(r => r.document.fields);
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function updateOmsStatus(supabaseUrl, supabaseKey, { filter, channel }) {
    const params = new URLSearchParams({
        ...filter,
        channel: `eq.${channel}`,
        status: 'neq.entregado',
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/orders?${params}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation',
        },
        body: JSON.stringify({ status: 'entregado' }),
    });

    if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
    return await res.json();
}
