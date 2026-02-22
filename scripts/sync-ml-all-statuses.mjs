/**
 * SYNC: Actualizar el estado de TODAS las órdenes ML según la API de ML
 *
 * Para cada orden ML en Supabase:
 *   1. GET /orders/{order_id}  → mlOrder.status (paid, cancelled…)
 *   2. Si tiene shipping_id    → GET /shipments/{id} → shipment.status
 *   3. Calcula el estado OMS con mapMLStatus()
 *   4. Actualiza Supabase solo si el estado cambió
 *
 * Uso:
 *   node scripts/sync-ml-all-statuses.mjs            # actualiza de verdad
 *   node scripts/sync-ml-all-statuses.mjs --dry-run  # solo reporta, no modifica
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Leer .env.local ──────────────────────────────────────────────────────────

const env = Object.fromEntries(
    readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
        .filter(([k]) => k)
);

const SUPABASE_URL  = env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = env.VITE_SUPABASE_ANON_KEY;
let ACCESS_TOKEN    = env.VITE_ML_ACCESS_TOKEN;
const REFRESH_TOKEN = env.VITE_ML_REFRESH_TOKEN;
const CLIENT_ID     = env.VITE_ML_CLIENT_ID;
const CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;

const PAGE_SIZE = 1000;
const BATCH     = 5;   // peticiones paralelas a ML
const DELAY_MS  = 250; // pausa entre lotes

// ─── Mapeo de estados (igual que en api/sync-ml.js) ──────────────────────────

function mapMLStatus(mlOrderStatus, shipmentStatus, shipmentSubstatus) {
    if (mlOrderStatus === 'cancelled') return 'cancelado';

    switch (shipmentStatus) {
        case 'delivered':     return 'entregado';
        case 'shipped':       return 'enviado';
        case 'cancelled':
        case 'returned':      return 'cancelado';
        case 'handling':      return 'preparando';
        case 'ready_to_ship':
            return shipmentSubstatus === 'ready_to_print' ? 'nuevo' : 'preparando';
        default:              return 'nuevo';
    }
}

// ─── Token refresh ─────────────────────────────────────────────────────────────

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

async function fetchMLOrderStatus(orderId, retry = true) {
    const res = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (res.status === 401 && retry) {
        await refreshToken();
        return fetchMLOrderStatus(orderId, false);
    }
    if (!res.ok) throw new Error(`ML /orders ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.status; // 'paid', 'cancelled', etc.
}

async function fetchMLShipmentStatus(shipmentId, retry = true) {
    const res = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (res.status === 401 && retry) {
        await refreshToken();
        return fetchMLShipmentStatus(shipmentId, false);
    }
    if (!res.ok) throw new Error(`ML /shipments ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { status: data.status, substatus: data.substatus || null };
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function fetchPage(offset) {
    const params = new URLSearchParams({
        channel: 'eq.mercadolibre',
        select: 'id,order_id,shipping_id,status',
        order: 'order_date.asc',
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${params}`, {
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

async function collectAll() {
    const all = [];
    let offset = 0;
    while (true) {
        const page = await fetchPage(offset);
        if (page.length === 0) break;
        all.push(...page);
        process.stdout.write(`   ${all.length} órdenes recolectadas...\r`);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }
    return all;
}

async function updateStatus(supabaseId, newStatus) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${supabaseId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}

// ─── Procesar ─────────────────────────────────────────────────────────────────

async function processOrders(orders, counters) {
    for (let i = 0; i < orders.length; i += BATCH) {
        const batch = orders.slice(i, i + BATCH);

        await Promise.all(batch.map(async ({ id, order_id, shipping_id, status: currentStatus }) => {
            try {
                // 1. Estado de la orden en ML
                const mlOrderStatus = await fetchMLOrderStatus(order_id);

                // 2. Estado del envío (si aplica)
                let shipmentStatus = null;
                let shipmentSubstatus = null;
                if (mlOrderStatus !== 'cancelled' && shipping_id) {
                    ({ status: shipmentStatus, substatus: shipmentSubstatus } = await fetchMLShipmentStatus(shipping_id));
                }

                // 3. Calcular nuevo estado OMS
                const newStatus = mapMLStatus(mlOrderStatus, shipmentStatus, shipmentSubstatus);

                // 4. Actualizar solo si cambió
                if (newStatus !== currentStatus) {
                    if (!DRY_RUN) await updateStatus(id, newStatus);
                    console.log(`   ${DRY_RUN ? '[DRY]' : '✅'} ${order_id}: ${currentStatus} → ${newStatus}`);
                    counters.updated++;
                } else {
                    counters.unchanged++;
                }
            } catch (e) {
                console.error(`   ❌ ${order_id}: ${e.message}`);
                counters.errors++;
            }
        }));

        const done = Math.min(i + BATCH, orders.length);
        process.stdout.write(`   Progreso: ${done}/${orders.length}\r`);

        if (i + BATCH < orders.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`=== Sync estado ML → OMS ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

    if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltan vars de Supabase'); process.exit(1); }
    if (!ACCESS_TOKEN || !REFRESH_TOKEN) { console.error('❌ Faltan vars de ML'); process.exit(1); }

    console.log('📋 Fase 1: recolectando todas las órdenes ML de Supabase...');
    const orders = await collectAll();
    console.log(`\n   Total: ${orders.length} órdenes\n`);

    if (orders.length === 0) {
        console.log('✅ No hay órdenes ML en Supabase.');
        return;
    }

    const counters = { updated: 0, unchanged: 0, errors: 0 };

    console.log('🔄 Fase 2: consultando ML y actualizando estados...\n');
    await processOrders(orders, counters);

    console.log('\n─────────────────────────────────────');
    if (DRY_RUN) console.log('⚠️  DRY RUN — no se modificó nada');
    console.log(`✅ Actualizados  : ${counters.updated}`);
    console.log(`➡️  Sin cambios   : ${counters.unchanged}`);
    console.log(`❌ Errores       : ${counters.errors}`);
    console.log('─────────────────────────────────────');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
