/**
 * BACKFILL: Marcar como 'entregado' en OMS las órdenes ML que ya entregó ML
 *
 * Aplica a pedidos con logistic_type:
 *   - fulfillment  → ML gestiona la entrega completa (FULL)
 *   - cross_docking → Courier de ML (Colecta)
 *
 * NO aplica a self_service: esos los gestiona Halcon.
 *
 * Fase 1: recolecta todos los IDs pendientes de Supabase (paginado).
 * Fase 2: consulta /shipments/{id} en ML y marca los 'delivered'.
 *
 * Uso:
 *   node scripts/backfill-ml-entregados.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Leer .env.local ──────────────────────────────────────────────────────────

const env = Object.fromEntries(
    readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
        .filter(([k]) => k)
);

const SUPABASE_URL   = env.VITE_SUPABASE_URL;
const SUPABASE_KEY   = env.VITE_SUPABASE_ANON_KEY;
let ACCESS_TOKEN     = env.VITE_ML_ACCESS_TOKEN;
const REFRESH_TOKEN  = env.VITE_ML_REFRESH_TOKEN;
const CLIENT_ID      = env.VITE_ML_CLIENT_ID;
const CLIENT_SECRET  = env.VITE_ML_CLIENT_SECRET;

const PAGE_SIZE = 1000;

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshToken() {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: REFRESH_TOKEN,
        }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    ACCESS_TOKEN = data.access_token;
    console.log('🔄 Token refrescado');
}

// ─── ML API ───────────────────────────────────────────────────────────────────

async function fetchShipmentStatus(shipmentId, retry = true) {
    const res = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (res.status === 401 && retry) {
        await refreshToken();
        return fetchShipmentStatus(shipmentId, false);
    }
    if (!res.ok) throw new Error(`ML API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { status: data.status, substatus: data.substatus };
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function fetchPage(logisticType, offset) {
    const params = new URLSearchParams({
        channel: 'eq.mercadolibre',
        logistic_type: `eq.${logisticType}`,
        status: 'neq.entregado',
        select: 'id,order_id,shipping_id',
        order: 'order_date.asc',
    });
    // Excluir también cancelado
    const url = `${SUPABASE_URL}/rest/v1/orders?${params}&status=neq.cancelado`;

    const res = await fetch(url, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Range-Unit': 'items',
            Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        },
    });
    if (res.status === 416) return [];
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
}

async function collectAll(logisticType) {
    const all = [];
    let offset = 0;
    while (true) {
        const page = await fetchPage(logisticType, offset);
        if (page.length === 0) break;
        all.push(...page);
        process.stdout.write(`   ${all.length} recolectadas...\r`);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }
    return all;
}

async function markEntregado(supabaseId) {
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

// ─── Procesar lote ────────────────────────────────────────────────────────────

async function processOrders(orders, counters) {
    const BATCH = 5;
    for (let i = 0; i < orders.length; i += BATCH) {
        const batch = orders.slice(i, i + BATCH);

        await Promise.all(batch.map(async ({ id, order_id, shipping_id }) => {
            if (!shipping_id) { counters.skipped++; return; }

            try {
                const { status, substatus } = await fetchShipmentStatus(shipping_id);

                if (status === 'delivered') {
                    await markEntregado(id);
                    console.log(`   ✅ Orden ${order_id} (${shipping_id}) → entregado`);
                    counters.updated++;
                } else {
                    // No loguear cada uno para no saturar la consola
                    counters.skipped++;
                }
            } catch (e) {
                console.error(`   ❌ Orden ${order_id}: ${e.message}`);
                counters.errors++;
            }
        }));

        if (i + BATCH < orders.length) {
            await new Promise(r => setTimeout(r, 250));
        }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Backfill: ML entregados → OMS ===\n');

    if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltan vars de Supabase'); process.exit(1); }
    if (!ACCESS_TOKEN || !REFRESH_TOKEN) { console.error('❌ Faltan vars de ML'); process.exit(1); }

    const counters = { updated: 0, skipped: 0, errors: 0 };

    for (const type of ['fulfillment', 'cross_docking', 'self_service']) {
        console.log(`\n📦 Fase 1 [${type}]: recolectando IDs pendientes...`);
        const orders = await collectAll(type);
        console.log(`\n   Total: ${orders.length} órdenes\n`);

        if (orders.length === 0) continue;

        console.log(`🔄 Fase 2 [${type}]: consultando ML y marcando entregados...`);
        await processOrders(orders, counters);
    }

    console.log('\n─────────────────────────────────────');
    console.log(`✅ Marcados entregado : ${counters.updated}`);
    console.log(`⏭️  No entregados aún  : ${counters.skipped}`);
    console.log(`❌ Errores            : ${counters.errors}`);
    console.log('─────────────────────────────────────');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
