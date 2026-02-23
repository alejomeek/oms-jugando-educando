/**
 * BACKFILL: Copiar remisiones desde meli_reconciliation → OMS
 *
 * Lee ml_orders (meli_reconciliation) donde remision IS NOT NULL
 * y actualiza orders (OMS) con remision_tbc y fecha_remision_tbc.
 *
 * Uso:
 *   node scripts/backfill-remisiones.mjs            # importa de verdad
 *   node scripts/backfill-remisiones.mjs --dry-run  # solo reporta, no modifica
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

const OMS_URL  = env.VITE_SUPABASE_URL;
const OMS_KEY  = env.VITE_SUPABASE_ANON_KEY;
const RECON_URL = env.VITE_RECON_SUPABASE_URL;
const RECON_KEY = env.VITE_RECON_SUPABASE_KEY;

if (!OMS_URL || !OMS_KEY || !RECON_URL || !RECON_KEY) {
    console.error('❌ Faltan variables de entorno. Verifica .env.local');
    process.exit(1);
}

// ─── Leer remisiones desde meli_reconciliation (con paginación) ───────────────

async function fetchRemisiones() {
    const all = [];
    const PAGE = 1000;
    let offset = 0;

    while (true) {
        const res = await fetch(
            `${RECON_URL}/rest/v1/ml_orders?remision=not.is.null&select=order_id,remision,fecha_remision`,
            {
                headers: {
                    apikey: RECON_KEY,
                    Authorization: `Bearer ${RECON_KEY}`,
                    Range: `${offset}-${offset + PAGE - 1}`,
                    Prefer: 'count=exact',
                },
            }
        );
        if (!res.ok) throw new Error(`meli_reconciliation ${res.status}: ${await res.text()}`);

        const page = await res.json();
        all.push(...page);

        const contentRange = res.headers.get('content-range'); // ej: "0-999/1157"
        const total = contentRange ? parseInt(contentRange.split('/')[1]) : all.length;

        if (all.length >= total) break;
        offset += PAGE;
    }

    return all;
}

// ─── Actualizar OMS ───────────────────────────────────────────────────────────

async function updateOmsOrder(order_id, remision, fecha_remision) {
    const body = {
        remision_tbc: remision,
        ...(fecha_remision ? { fecha_remision_tbc: fecha_remision } : {}),
    };

    const res = await fetch(
        `${OMS_URL}/rest/v1/orders?channel=eq.mercadolibre&order_id=eq.${encodeURIComponent(order_id)}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                apikey: OMS_KEY,
                Authorization: `Bearer ${OMS_KEY}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(body),
        }
    );
    if (!res.ok) throw new Error(`OMS PATCH ${order_id} → ${res.status}: ${await res.text()}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n📋 Backfill remisiones meli_reconciliation → OMS${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    const remisiones = await fetchRemisiones();
    console.log(`   ${remisiones.length} órdenes con remisión en meli_reconciliation\n`);

    if (remisiones.length === 0) {
        console.log('✅ Nada que migrar.\n');
        return;
    }

    let updated = 0;
    let skipped = 0;

    for (const { order_id, remision, fecha_remision } of remisiones) {
        if (DRY_RUN) {
            console.log(`   [DRY] ${order_id} → remision: ${remision} | fecha: ${fecha_remision ?? 'null'}`);
        } else {
            try {
                await updateOmsOrder(order_id, remision, fecha_remision);
                updated++;
            } catch (e) {
                console.warn(`   ⚠️  ${order_id}: ${e.message}`);
                skipped++;
            }
        }
    }

    if (DRY_RUN) {
        console.log(`\n✅ Dry run completado: ${remisiones.length} remisiones encontradas\n`);
    } else {
        console.log(`\n✅ Completado: ${updated} actualizadas, ${skipped} con error\n`);
    }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
