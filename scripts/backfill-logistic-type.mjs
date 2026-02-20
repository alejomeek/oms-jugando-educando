/**
 * BACKFILL LOGISTIC TYPE — Jugando y Educando OMS
 * Rellena la columna logistic_type para todas las órdenes de ML
 * que ya existen en Supabase pero no tienen ese dato.
 *
 * Lógica:
 *  1. Consulta Supabase: órdenes ML con shipping_id y logistic_type IS NULL
 *  2. Por cada una, llama a GET /shipments/{id} en la API de ML
 *  3. Actualiza logistic_type en Supabase
 *
 * Uso:
 *   node scripts/backfill-logistic-type.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const CONCURRENCY = 20;   // Requests paralelos a ML
const BATCH_DELAY_MS = 300; // Pausa entre lotes para respetar rate limit

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
let ML_ACCESS_TOKEN = env.VITE_ML_ACCESS_TOKEN;
const ML_REFRESH_TOKEN = env.VITE_ML_REFRESH_TOKEN;
const ML_CLIENT_ID = env.VITE_ML_CLIENT_ID;
const ML_CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;

const missing = [
    'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY',
    'VITE_ML_ACCESS_TOKEN', 'VITE_ML_REFRESH_TOKEN',
    'VITE_ML_CLIENT_ID', 'VITE_ML_CLIENT_SECRET',
].filter(k => !env[k]);

if (missing.length) {
    console.error('❌ Faltan variables en .env.local:', missing.join(', '));
    process.exit(1);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function mlHeaders() {
    return { Authorization: `Bearer ${ML_ACCESS_TOKEN}` };
}

async function refreshMLToken() {
    console.log('🔄 Refrescando token de ML...');
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: ML_CLIENT_ID,
            client_secret: ML_CLIENT_SECRET,
            refresh_token: ML_REFRESH_TOKEN,
        }),
    });
    if (!res.ok) throw new Error(`Error refresh token: ${res.statusText}`);
    const data = await res.json();
    ML_ACCESS_TOKEN = data.access_token;
    console.log('✅ Token refrescado');
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function supabaseRequest(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase error ${res.status}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
}

/** Trae todas las órdenes ML con shipping_id y sin logistic_type (en páginas de 1000) */
async function fetchOrdersToBackfill() {
    const all = [];
    let offset = 0;
    const pageSize = 1000;

    while (true) {
        const rows = await supabaseRequest(
            `orders?channel=eq.mercadolibre&shipping_id=not.is.null&logistic_type=is.null&select=id,shipping_id&limit=${pageSize}&offset=${offset}`,
            { headers: { Prefer: 'count=exact' } }
        );
        if (!rows || rows.length === 0) break;
        all.push(...rows);
        if (rows.length < pageSize) break;
        offset += pageSize;
    }

    return all;
}

/** Consulta el logistic_type de un shipment en ML */
async function fetchLogisticType(shipmentId) {
    let res = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        { headers: mlHeaders() }
    );

    // Si el token expiró, refrescar y reintentar una vez
    if (res.status === 401) {
        await refreshMLToken();
        res = await fetch(
            `https://api.mercadolibre.com/shipments/${shipmentId}`,
            { headers: mlHeaders() }
        );
    }

    if (!res.ok) return null;
    const data = await res.json();
    return data.logistic_type || null;
}

/** Actualiza logistic_type en Supabase para un registro */
async function updateLogisticType(orderId, logisticType) {
    await supabaseRequest(
        `orders?id=eq.${orderId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ logistic_type: logisticType }),
        }
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Backfill logistic_type — Jugando y Educando OMS');
    console.log('─'.repeat(50));

    // 1. Obtener órdenes a procesar
    console.log('📋 Consultando órdenes sin logistic_type en Supabase...');
    const orders = await fetchOrdersToBackfill();

    if (orders.length === 0) {
        console.log('✅ No hay órdenes pendientes. Todo está al día.');
        return;
    }

    console.log(`📦 ${orders.length} órdenes para procesar\n`);

    // 2. Procesar en lotes
    let updated = 0;
    let failed = 0;
    let nullType = 0;
    const startTime = Date.now();

    for (let i = 0; i < orders.length; i += CONCURRENCY) {
        const batch = orders.slice(i, i + CONCURRENCY);
        const batchNum = Math.floor(i / CONCURRENCY) + 1;
        const totalBatches = Math.ceil(orders.length / CONCURRENCY);

        process.stdout.write(`\r⏳ Lote ${batchNum}/${totalBatches} — Actualizadas: ${updated} | Fallidas: ${failed}`);

        await Promise.all(batch.map(async (order) => {
            try {
                const logisticType = await fetchLogisticType(order.shipping_id);
                await updateLogisticType(order.id, logisticType);

                if (logisticType) {
                    updated++;
                } else {
                    nullType++; // Envío sin logistic_type en ML (raro pero posible)
                    updated++;
                }
            } catch (err) {
                failed++;
                // Silenciar errores individuales para no romper el progreso
            }
        }));

        if (i + CONCURRENCY < orders.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n${'─'.repeat(50)}`);
    console.log(`✅ Completado en ${elapsed}s`);
    console.log(`   Actualizadas : ${updated}`);
    console.log(`   Con valor null: ${nullType} (envíos sin logistic_type en ML)`);
    console.log(`   Fallidas      : ${failed}`);

    if (failed > 0) {
        console.log(`\n⚠️  ${failed} órdenes fallaron. Puedes volver a correr el script — solo procesará las que siguen con logistic_type IS NULL.`);
    }
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
