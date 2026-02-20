/**
 * MIGRACIÓN: Halcon entregados → OMS
 *
 * Consulta pedidos_wix y pedidos_flex de Firestore con estado='entregado'
 * y actualiza el status en Supabase a 'entregado'.
 *
 * Es idempotente: omite los pedidos que ya están entregados en OMS.
 *
 * Uso:
 *   node scripts/migrate-halcon-entregados.mjs
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

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

// ─── Firebase (mismo proyecto que recibir-pedido.js) ─────────────────────────

const FIREBASE_API_KEY = env.HALCON_FIREBASE_API_KEY;
const PROJECT_ID = env.HALCON_FIREBASE_PROJECT_ID;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const QUERY_URL = `${FIRESTORE_URL}:runQuery?key=${FIREBASE_API_KEY}`;

// ─── Firestore helpers ────────────────────────────────────────────────────────

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

    if (!res.ok) throw new Error(`Firestore error ${res.status}: ${await res.text()}`);

    const rows = await res.json();
    // runQuery devuelve array; cada elemento tiene 'document' si hay resultado
    return rows.filter(r => r.document).map(r => r.document.fields);
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

async function updateOmsStatus(filter, channel) {
    const params = new URLSearchParams({
        ...filter,
        channel: `eq.${channel}`,
        status: 'neq.entregado',   // idempotente: no tocar los ya entregados
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${params}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation',
        },
        body: JSON.stringify({ status: 'entregado' }),
    });

    if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
    return await res.json(); // array de filas actualizadas
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Migración: Halcon entregados → OMS ===\n');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
        process.exit(1);
    }

    if (!FIREBASE_API_KEY || !PROJECT_ID) {
        console.error('❌ Faltan HALCON_FIREBASE_API_KEY o HALCON_FIREBASE_PROJECT_ID en .env.local');
        process.exit(1);
    }

    let totalUpdated = 0;
    let totalSkipped = 0;

    // ── 1. pedidos_wix ────────────────────────────────────────────────────────
    console.log('📦 Consultando pedidos_wix en Firestore...');
    const wixPedidos = await queryEntregados('pedidos_wix');
    console.log(`   Encontrados: ${wixPedidos.length} con estado=entregado\n`);

    for (const fields of wixPedidos) {
        const numeroPedidoWix = fields.numero_pedido_wix?.stringValue;
        const numeroEnvio = fields.numero_envio?.stringValue;

        if (!numeroPedidoWix) {
            console.log(`   ⚠️  Sin numero_pedido_wix (numero_envio=${numeroEnvio}) → skip`);
            totalSkipped++;
            continue;
        }

        const updated = await updateOmsStatus(
            { order_id: `eq.${numeroPedidoWix}` },
            'wix'
        );

        if (updated.length > 0) {
            console.log(`   ✅ Wix #${numeroPedidoWix} → entregado`);
            totalUpdated += updated.length;
        } else {
            console.log(`   ⏭️  Wix #${numeroPedidoWix} → ya entregado o no existe en OMS`);
            totalSkipped++;
        }
    }

    // ── 2. pedidos_flex ───────────────────────────────────────────────────────
    console.log('\n📦 Consultando pedidos_flex en Firestore...');
    const flexPedidos = await queryEntregados('pedidos_flex');
    console.log(`   Encontrados: ${flexPedidos.length} con estado=entregado\n`);

    for (const fields of flexPedidos) {
        const numeroEnvio = fields.numero_envio?.stringValue;
        const numeroVenta = fields.numero_venta?.stringValue;

        if (!numeroEnvio) {
            console.log(`   ⚠️  Sin numero_envio (numero_venta=${numeroVenta}) → skip`);
            totalSkipped++;
            continue;
        }

        const updated = await updateOmsStatus(
            { shipping_id: `eq.${numeroEnvio}` },
            'mercadolibre'
        );

        if (updated.length > 0) {
            console.log(`   ✅ ML shipping ${numeroEnvio} → ${updated.length} fila(s) entregado`);
            totalUpdated += updated.length;
        } else {
            console.log(`   ⏭️  ML shipping ${numeroEnvio} → ya entregado o no existe en OMS`);
            totalSkipped++;
        }
    }

    // ── Resumen ───────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────');
    console.log(`✅ Actualizados : ${totalUpdated} pedido(s) en OMS`);
    console.log(`⏭️  Omitidos     : ${totalSkipped} (ya entregados o no en OMS)`);
    console.log('─────────────────────────────────────');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
