/**
 * BACKFILL: Importar órdenes Wix UNPAID desde dic 1, 2025
 *
 * Las órdenes UNPAID de Wix (pagadas por transferencia, link de pago, etc.)
 * no fueron importadas porque el sync solo traía PAID. Este script las recupera.
 *
 * Uso:
 *   node scripts/backfill-wix-unpaid.mjs            # importa de verdad
 *   node scripts/backfill-wix-unpaid.mjs --dry-run  # solo reporta, no modifica
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

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const WIX_API_KEY  = env.VITE_WIX_API_KEY;
const WIX_SITE_ID  = env.VITE_WIX_SITE_ID;

const DATE_FROM = '2025-12-01T00:00:00.000Z';
const LIMIT     = 50;

// ─── Normalizar orden Wix ─────────────────────────────────────────────────────

function normalizeWixOrder(wixOrder) {
    return {
        order_id: wixOrder.number,
        channel: 'wix',
        pack_id: null,
        shipping_id: null,
        status: wixOrder.status === 'CANCELED'
            ? 'cancelado'
            : wixOrder.fulfillmentStatus === 'FULFILLED'
                ? 'entregado'
                : 'nuevo',
        order_date: wixOrder.createdDate || wixOrder._createdDate || new Date().toISOString(),
        closed_date: wixOrder.updatedDate || wixOrder._updatedDate || null,
        total_amount: parseFloat(wixOrder.priceSummary?.total?.amount || wixOrder.priceSummary?.total || 0),
        paid_amount: parseFloat(wixOrder.priceSummary?.total?.amount || wixOrder.priceSummary?.total || 0),
        currency: wixOrder.currency,
        customer: {
            source: 'wix',
            id: wixOrder.buyerInfo?.id,
            email: wixOrder.buyerInfo?.email,
            firstName: wixOrder.billingInfo?.contactDetails?.firstName,
            lastName: wixOrder.billingInfo?.contactDetails?.lastName,
            phone: wixOrder.billingInfo?.contactDetails?.phone,
        },
        shipping_address: (() => {
            const dest = wixOrder.shippingInfo?.logistics?.shippingDestination;
            const addr = dest?.address ?? wixOrder.recipientInfo?.address;
            const contact = dest?.contactDetails ?? wixOrder.recipientInfo?.contactDetails;
            if (!addr) return null;
            return {
                street: [addr.addressLine, addr.addressLine2].filter(Boolean).join(', '),
                city: addr.city || '',
                state: addr.subdivisionFullname || addr.subdivision || '',
                country: addr.countryFullname || addr.country || '',
                zipCode: addr.postalCode || '',
                receiverName: contact ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : undefined,
                receiverPhone: contact?.phone,
            };
        })(),
        items: wixOrder.lineItems?.map((item) => ({
            sku: item.physicalProperties?.sku || item.sku || item.id,
            title: item.productName?.translated || item.productName?.original || 'Sin nombre',
            quantity: item.quantity,
            unitPrice: parseFloat(item.price?.amount || item.price || 0),
            fullPrice: parseFloat(item.totalPriceAfterTax?.amount || item.totalPrice?.amount || item.price?.amount || 0),
            currency: wixOrder.currency,
            imageUrl: item.image?.url,
        })) || [],
        payment_info: {
            status: wixOrder.paymentStatus,
            shipping_cost: parseFloat(wixOrder.priceSummary?.shipping?.amount || wixOrder.priceSummary?.shipping || 0) || undefined,
        },
        tags: [],
        notes: null,
    };
}

// ─── Wix API ──────────────────────────────────────────────────────────────────

async function fetchWixPage(cursor) {
    const body = {
        search: {
            cursorPaging: { limit: LIMIT, cursor: cursor || undefined },
            // Sin filtro de paymentStatus ni fecha — filtramos client-side
            // (la API de Wix no soporta filtro de fecha en este endpoint)
            sort: [{ fieldName: 'createdDate', order: 'DESC' }],
        },
    };

    const res = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
        method: 'POST',
        headers: {
            Authorization: WIX_API_KEY,
            'wix-site-id': WIX_SITE_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Wix API ${res.status}: ${await res.text()}`);
    return res.json();
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertOrders(orders) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?on_conflict=channel%2Corder_id`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(orders),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n📦 Backfill Wix UNPAID desde ${DATE_FROM.split('T')[0]}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    if (!WIX_API_KEY || !WIX_SITE_ID) {
        console.error('❌ Faltan VITE_WIX_API_KEY o VITE_WIX_SITE_ID en .env.local');
        process.exit(1);
    }

    let cursor = null;
    let totalFetched = 0;
    let totalUpserted = 0;
    let page = 1;

    while (true) {
        process.stdout.write(`   Página ${page} (acumulado: ${totalFetched})...\r`);

        const data = await fetchWixPage(cursor);
        const orders = data.orders || [];

        if (orders.length === 0) break;

        // Filtrar solo las que son de la fecha en adelante (por si la API no filtra exacto)
        // Filtrar órdenes dentro del rango de fecha
        const inRange = orders.filter(o => {
            const d = o.createdDate || o._createdDate;
            return d && d >= DATE_FROM;
        });

        totalFetched += inRange.length;

        if (inRange.length > 0) {
            const normalized = inRange.map(normalizeWixOrder);

            if (DRY_RUN) {
                normalized.forEach(o => {
                    const raw = inRange.find(r => r.number === o.order_id);
                    console.log(`   [DRY] ${o.order_id} | ${o.order_date?.split('T')[0]} | ${raw?.paymentStatus}`);
                });
            } else {
                await upsertOrders(normalized);
                totalUpserted += normalized.length;
            }
        }

        // Si alguna orden de la página es más antigua que DATE_FROM → ya llegamos al límite
        if (inRange.length < orders.length) break;

        cursor = data.metadata?.cursors?.next || null;
        if (!cursor || !data.metadata?.hasNext) break;
        page++;
    }

    console.log(`\n✅ Completado: ${totalFetched} órdenes encontradas${DRY_RUN ? '' : `, ${totalUpserted} insertadas/actualizadas`}\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
