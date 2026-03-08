/**
 * Backfill del campo `cutoff` (pay_before de ML) en las 100 órdenes más recientes
 * de Mercado Libre que aún no tienen el campo poblado.
 *
 * Uso: node scripts/backfill-cutoff.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = Object.fromEntries(
    readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
        .filter(([k]) => k)
);

let ML_ACCESS_TOKEN  = env.VITE_ML_ACCESS_TOKEN;
const ML_REFRESH_TOKEN = env.VITE_ML_REFRESH_TOKEN;
const ML_CLIENT_ID     = env.VITE_ML_CLIENT_ID;
const ML_CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;
const SUPABASE_URL     = env.VITE_SUPABASE_URL;
const SUPABASE_KEY     = env.VITE_SUPABASE_ANON_KEY;

async function refreshMLToken() {
    console.log('🔄 Refrescando token ML...');
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
    if (!res.ok) throw new Error('Error al refrescar token ML');
    const data = await res.json();
    ML_ACCESS_TOKEN = data.access_token;
    console.log('✅ Token refrescado');
}

async function fetchPayBefore(shipmentId) {
    const res = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${ML_ACCESS_TOKEN}` },
    });
    if (res.status === 401) return null; // Manejar expiración afuera
    if (!res.ok) return undefined;       // undefined = error, null = sin dato
    const data = await res.json();
    return data.shipping_option?.estimated_delivery_time?.pay_before ?? null;
}

async function updateCutoff(orderId, cutoff) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ cutoff }),
        }
    );
    if (!res.ok) throw new Error(`Error actualizando orden ${orderId}: ${res.status}`);
}

async function run() {
    await refreshMLToken();

    // Obtener las 100 órdenes ML más recientes con shipping_id y sin cutoff
    console.log('\n📋 Consultando órdenes sin cutoff...');
    const queryRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?channel=eq.mercadolibre&shipping_id=not.is.null&cutoff=is.null&order=order_date.desc&limit=100&select=id,order_id,shipping_id`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
        }
    );
    if (!queryRes.ok) throw new Error(`Error consultando Supabase: ${queryRes.status}`);
    const orders = await queryRes.json();
    console.log(`🔢 ${orders.length} órdenes para actualizar\n`);

    let updated = 0;
    let skipped = 0;
    let errors  = 0;

    // Procesar en batches de 10 para no sobrecargar la API de ML
    const BATCH = 10;
    for (let i = 0; i < orders.length; i += BATCH) {
        const batch = orders.slice(i, i + BATCH);
        await Promise.all(batch.map(async (order) => {
            try {
                let payBefore = await fetchPayBefore(order.shipping_id);

                // Si el token expiró, refrescar y reintentar una vez
                if (payBefore === null && !payBefore) {
                    // null puede ser dato válido (sin pay_before) — distinguir con undefined
                }
                if (payBefore === undefined) {
                    // Fetch fallido por error HTTP
                    const retryRes = await fetch(`https://api.mercadolibre.com/shipments/${order.shipping_id}`, {
                        headers: { Authorization: `Bearer ${ML_ACCESS_TOKEN}` },
                    });
                    if (retryRes.status === 401) {
                        await refreshMLToken();
                        payBefore = await fetchPayBefore(order.shipping_id);
                    } else {
                        errors++;
                        console.log(`  ⚠️  Error en shipment ${order.shipping_id} (orden ${order.order_id})`);
                        return;
                    }
                }

                if (payBefore) {
                    await updateCutoff(order.id, payBefore);
                    console.log(`  ✅ ${order.order_id} → cutoff: ${payBefore}`);
                    updated++;
                } else {
                    // La orden no tiene pay_before (p.ej. ordenes muy viejas o en estado inusual)
                    skipped++;
                    console.log(`  ➖ ${order.order_id} → sin pay_before (se omite)`);
                }
            } catch (err) {
                errors++;
                console.log(`  ❌ ${order.order_id}: ${err.message}`);
            }
        }));

        // Pequeña pausa entre batches
        if (i + BATCH < orders.length) await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ➖ Sin pay_before: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
}

run().catch(err => {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
});
