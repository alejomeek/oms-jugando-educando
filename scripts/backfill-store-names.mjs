/**
 * BACKFILL: store_id + store_name en órdenes ML existentes
 *
 * Fase 1: recolecta todos los IDs pendientes paginando por Supabase.
 * Fase 2: consulta ML por cada orden y actualiza los campos.
 *
 * Es idempotente: solo toca filas donde store_id IS NULL.
 *
 * Uso:
 *   node scripts/backfill-store-names.mjs
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

// ─── Store map ────────────────────────────────────────────────────────────────

const ML_STORE_MAP = {
    '76644462': 'MEDELLÍN',
    '71348293': 'AVENIDA 19',
    '71843625': 'CEDI',
    '71348291': 'BULEVAR',
};

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

async function fetchMLOrder(orderId, retry = true) {
    const res = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (res.status === 401 && retry) {
        await refreshToken();
        return fetchMLOrder(orderId, false);
    }
    if (!res.ok) throw new Error(`ML API ${res.status}: ${await res.text()}`);
    return res.json();
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function fetchPageWithoutStore(offset) {
    const params = new URLSearchParams({
        channel: 'eq.mercadolibre',
        store_id: 'is.null',
        select: 'id,order_id',
        order: 'order_date.desc',
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${params}`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Range-Unit': 'items',
            Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        },
    });
    if (res.status === 416) return []; // offset fuera de rango → fin
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
}

async function updateOrderStore(supabaseId, storeId, storeName) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${supabaseId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
        },
        body: JSON.stringify({ store_id: storeId, store_name: storeName }),
    });
    if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Backfill: store_id + store_name en órdenes ML ===\n');

    if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltan vars de Supabase'); process.exit(1); }
    if (!ACCESS_TOKEN || !REFRESH_TOKEN) { console.error('❌ Faltan vars de ML'); process.exit(1); }

    // ── Fase 1: recolectar todos los IDs pendientes ───────────────────────────
    console.log('📋 Fase 1: recolectando IDs pendientes de Supabase...');
    const allPending = [];
    let offset = 0;

    while (true) {
        const page = await fetchPageWithoutStore(offset);
        if (page.length === 0) break;
        allPending.push(...page);
        process.stdout.write(`   ${allPending.length} órdenes recolectadas...\r`);
        if (page.length < PAGE_SIZE) break; // última página
        offset += PAGE_SIZE;
    }

    console.log(`\n   Total pendientes: ${allPending.length} órdenes\n`);

    if (allPending.length === 0) {
        console.log('✅ No hay órdenes pendientes de backfill.');
        return;
    }

    // ── Fase 2: consultar ML y actualizar ─────────────────────────────────────
    console.log('🔄 Fase 2: consultando ML y actualizando Supabase...\n');

    let updated = 0;
    let skipped = 0;
    let errors  = 0;

    const BATCH = 5; // paralelas por lote
    for (let i = 0; i < allPending.length; i += BATCH) {
        const batch = allPending.slice(i, i + BATCH);

        await Promise.all(batch.map(async ({ id: supabaseId, order_id }) => {
            try {
                const mlOrder = await fetchMLOrder(order_id);
                const rawStoreId = mlOrder.order_items?.[0]?.stock?.store_id?.toString() || null;
                const storeName  = rawStoreId ? (ML_STORE_MAP[rawStoreId] || null) : null;

                if (!rawStoreId) {
                    console.log(`   ⚠️  Orden ${order_id} → sin stock.store_id → skip`);
                    skipped++;
                    return;
                }

                await updateOrderStore(supabaseId, rawStoreId, storeName);
                console.log(`   ✅ Orden ${order_id} → ${storeName ?? rawStoreId}`);
                updated++;
            } catch (e) {
                console.error(`   ❌ Orden ${order_id}: ${e.message}`);
                errors++;
            }
        }));

        // Pausa breve entre lotes
        if (i + BATCH < allPending.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    console.log('\n─────────────────────────────────────');
    console.log(`✅ Actualizados : ${updated}`);
    console.log(`⏭️  Sin store_id : ${skipped}`);
    console.log(`❌ Errores      : ${errors}`);
    console.log('─────────────────────────────────────');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
