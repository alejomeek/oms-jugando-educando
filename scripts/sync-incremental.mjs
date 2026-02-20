/**
 * SYNC INCREMENTAL — Jugando y Educando OMS
 * Descarga solo los pedidos nuevos o actualizados desde la última sincronización.
 *
 * Lógica:
 *  1. Consulta Supabase para encontrar la fecha del pedido más reciente.
 *  2. Resta 2 días como margen de seguridad (DATE_FROM).
 *  3. Descarga pedidos de ML y Wix desde DATE_FROM hasta ahora.
 *  4. Hace upsert en Supabase (no borra nada).
 *
 * Uso:
 *   node scripts/sync-incremental.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const SHIPMENT_CONCURRENCY = 5;
const SAFETY_MARGIN_DAYS = 2;
/** Fecha de arranque si la tabla está vacía */
const DEFAULT_FROM_DATE = '2024-01-01T00:00:00.000Z';

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
const ML_SELLER_ID = env.VITE_ML_SELLER_ID;
const ML_CLIENT_ID = env.VITE_ML_CLIENT_ID;
const ML_CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;
const WIX_API_KEY = env.VITE_WIX_API_KEY;
const WIX_SITE_ID = env.VITE_WIX_SITE_ID;

const missing = [
    'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY',
    'VITE_ML_ACCESS_TOKEN', 'VITE_ML_REFRESH_TOKEN',
    'VITE_ML_SELLER_ID', 'VITE_ML_CLIENT_ID', 'VITE_ML_CLIENT_SECRET',
    'VITE_WIX_API_KEY', 'VITE_WIX_SITE_ID',
].filter(k => !env[k]);

if (missing.length) {
    console.error('❌ Faltan variables en .env.local:', missing.join(', '));
    process.exit(1);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function mlHeaders() {
    return { Authorization: `Bearer ${ML_ACCESS_TOKEN}` };
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/** Ejecuta tasks en grupos de `concurrency` a la vez */
async function pLimit(tasks, concurrency) {
    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(t => t()));
        results.push(...batchResults);
        if (i + concurrency < tasks.length) await sleep(200);
    }
    return results;
}

// ─── ML: Refresh token ────────────────────────────────────────────────────────

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
    console.log('✅ Token refrescado. Expira en', data.expires_in / 3600, 'horas\n');
}

// ─── ML: Normalizar orden ─────────────────────────────────────────────────────

function normalizeMLOrder(mlOrder) {
    return {
        order_id: mlOrder.id.toString(),
        channel: 'mercadolibre',
        pack_id: mlOrder.pack_id?.toString() || null,
        shipping_id: mlOrder.shipping?.id?.toString() || null,
        status: 'enviado',
        order_date: mlOrder.date_created,
        closed_date: mlOrder.date_closed || null,
        total_amount: mlOrder.total_amount,
        paid_amount: mlOrder.paid_amount,
        currency: mlOrder.currency_id,
        customer: {
            source: 'mercadolibre',
            id: mlOrder.buyer.id.toString(),
            nickname: mlOrder.buyer.nickname,
        },
        shipping_address: null,
        items: mlOrder.order_items.map(item => ({
            sku: item.item.seller_sku,
            title: item.item.title,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            fullPrice: item.full_unit_price,
            currency: item.currency_id,
            variationAttributes: item.item.variation_attributes?.map(a => ({
                name: a.name, value: a.value_name,
            })) || [],
        })),
        payment_info: mlOrder.payments?.[0] ? {
            method: mlOrder.payments[0].payment_method_id,
            status: mlOrder.payments[0].status,
            installments: mlOrder.payments[0].installments,
            paidAmount: mlOrder.payments[0].total_paid_amount,
            paymentDate: mlOrder.payments[0].date_approved,
        } : null,
        tags: mlOrder.tags || [],
        notes: null,
    };
}

// ─── ML: Fetch dirección del envío ────────────────────────────────────────────

async function fetchMLShipmentAddress(shipmentId) {
    try {
        const res = await fetch(
            `https://api.mercadolibre.com/shipments/${shipmentId}`,
            { headers: mlHeaders() }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.receiver_address;
        if (!addr) return null;
        return {
            street: [addr.street_name, addr.street_number].filter(Boolean).join(' '),
            comment: addr.comment || undefined,
            neighborhood: addr.neighborhood?.name || undefined,
            city: addr.city?.name || '',
            state: addr.state?.name || '',
            country: addr.country?.name || addr.country_id || '',
            zipCode: addr.zip_code || '',
            receiverName: addr.receiver_name || undefined,
            receiverPhone: addr.receiver_phone || undefined,
            latitude: addr.latitude || undefined,
            longitude: addr.longitude || undefined,
        };
    } catch {
        return null;
    }
}

// ─── ML: Sincronización incremental ───────────────────────────────────────────

async function syncML(dateFrom, dateTo) {
    console.log('\n🟡 ═══════════════════════════════════════════');
    console.log('   MERCADO LIBRE');
    console.log('🟡 ═══════════════════════════════════════════\n');

    await refreshMLToken();

    const allOrders = [];
    let offset = 0;
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
        process.stdout.write(`📄 Página ${page} (offset ${offset})... `);

        const params = new URLSearchParams({
            seller: ML_SELLER_ID,
            sort: 'date_desc',
            limit: String(PAGE_SIZE),
            offset: String(offset),
            'order.date_created.from': dateFrom,
            'order.date_created.to': dateTo,
        });

        const res = await fetch(
            `https://api.mercadolibre.com/orders/search?${params}`,
            { headers: mlHeaders() }
        );

        if (res.status === 401) {
            await refreshMLToken();
            continue;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(`ML API error: ${data.message}`);

        const orders = data.results || [];
        console.log(`${orders.length} órdenes`);

        if (orders.length === 0) {
            keepGoing = false;
        } else {
            allOrders.push(...orders);
            offset += PAGE_SIZE;
            page++;
            if (orders.length < PAGE_SIZE) keepGoing = false;
        }
    }

    console.log(`\n✅ Total órdenes ML obtenidas: ${allOrders.length}`);

    if (allOrders.length === 0) return [];

    console.log('🚚 Obteniendo direcciones de envío (batches de 5)...\n');

    const normalized = allOrders.map(normalizeMLOrder);

    let done = 0;
    const tasks = normalized.map(order => async () => {
        if (order.shipping_id) {
            order.shipping_address = await fetchMLShipmentAddress(order.shipping_id);
        }
        done++;
        if (done % 10 === 0 || done === normalized.length) {
            process.stdout.write(`\r   Envíos: ${done}/${normalized.length}`);
        }
        return order;
    });

    await pLimit(tasks, SHIPMENT_CONCURRENCY);
    console.log('\n');

    return normalized;
}

// ─── Wix: Normalizar orden ────────────────────────────────────────────────────

function normalizeWixOrder(wixOrder) {
    const dest = wixOrder.shippingInfo?.logistics?.shippingDestination;
    const addr = dest?.address ?? wixOrder.recipientInfo?.address;
    const contact = dest?.contactDetails ?? wixOrder.recipientInfo?.contactDetails;

    const shipping_address = addr ? {
        street: [addr.addressLine, addr.addressLine2].filter(Boolean).join(', '),
        city: addr.city || '',
        state: addr.subdivisionFullname || addr.subdivision || '',
        country: addr.countryFullname || addr.country || '',
        zipCode: addr.postalCode || '',
        receiverName: contact ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : undefined,
        receiverPhone: contact?.phone,
    } : null;

    const cedula = wixOrder.customFields?.find(
        f => f.title?.toLowerCase().includes('cédula') || f.title?.toLowerCase().includes('cedula')
    )?.value;

    return {
        order_id: wixOrder.number,
        channel: 'wix',
        pack_id: null,
        shipping_id: null,
        status: 'enviado',
        order_date: wixOrder.createdDate || wixOrder._createdDate,
        closed_date: wixOrder.updatedDate || wixOrder._updatedDate || null,
        total_amount: parseFloat(wixOrder.priceSummary?.total?.amount || 0),
        paid_amount: parseFloat(wixOrder.priceSummary?.total?.amount || 0),
        currency: wixOrder.currency,
        customer: {
            source: 'wix',
            id: wixOrder.buyerInfo?.contactId || wixOrder.buyerInfo?.id,
            email: wixOrder.buyerInfo?.email,
            firstName: wixOrder.billingInfo?.contactDetails?.firstName,
            lastName: wixOrder.billingInfo?.contactDetails?.lastName,
            phone: wixOrder.billingInfo?.contactDetails?.phone,
            cedula: cedula || undefined,
        },
        shipping_address,
        items: (wixOrder.lineItems || []).map(item => ({
            sku: item.physicalProperties?.sku || item.sku || item.id,
            title: item.productName?.translated || item.productName?.original || 'Sin nombre',
            quantity: item.quantity,
            unitPrice: parseFloat(item.price?.amount || item.price || 0),
            fullPrice: parseFloat(item.totalPriceAfterTax?.amount || item.totalPrice?.amount || item.price?.amount || 0),
            currency: wixOrder.currency,
            imageUrl: item.image?.url,
        })),
        payment_info: {
            status: wixOrder.paymentStatus,
            shippingMethod: wixOrder.shippingInfo?.title || undefined,
        },
        tags: [],
        notes: wixOrder.buyerNote || null,
    };
}

// ─── Wix: Sincronización incremental ──────────────────────────────────────────

async function syncWix(dateFrom, dateTo) {
    console.log('\n🟢 ═══════════════════════════════════════════');
    console.log('   WIX');
    console.log('🟢 ═══════════════════════════════════════════\n');

    const allOrders = [];
    let cursor = null;
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
        process.stdout.write(`📄 Página ${page}... `);

        const res = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
            method: 'POST',
            headers: {
                Authorization: WIX_API_KEY,
                'wix-site-id': WIX_SITE_ID,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                search: {
                    cursorPaging: { limit: PAGE_SIZE, cursor: cursor || undefined },
                    filter: { paymentStatus: 'PAID' },
                    sort: [{ fieldName: 'createdDate', order: 'DESC' }],
                },
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Wix API error (${res.status}): ${data.message || JSON.stringify(data)}`);

        const orders = data.orders || [];

        const inRange = orders.filter(o => {
            const d = o.createdDate || o._createdDate;
            return d >= dateFrom && d <= dateTo;
        });

        const outOfRange = orders.filter(o => {
            const d = o.createdDate || o._createdDate;
            return d < dateFrom;
        });

        console.log(`${inRange.length} en rango${outOfRange.length > 0 ? `, ${outOfRange.length} fuera de rango (fin)` : ''}`);

        allOrders.push(...inRange);

        cursor = (data.metadata || data.pagingMetadata)?.cursors?.next || null;
        page++;

        if (outOfRange.length > 0 || orders.length < PAGE_SIZE || !cursor) {
            keepGoing = false;
        }
    }

    console.log(`\n✅ Total órdenes Wix obtenidas: ${allOrders.length}`);

    return allOrders.map(normalizeWixOrder);
}

// ─── Supabase: Obtener fecha del último pedido ────────────────────────────────

async function getLastOrderDate() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?select=order_date&order=order_date.desc&limit=1`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
        }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Error al consultar Supabase: ${err.message || res.statusText}`);
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
        console.log(`⚠️  Tabla vacía. Usando fecha por defecto: ${DEFAULT_FROM_DATE.split('T')[0]}`);
        return DEFAULT_FROM_DATE;
    }

    return rows[0].order_date;
}

// ─── Supabase: Upsert ─────────────────────────────────────────────────────────

async function upsertToSupabase(orders, channel) {
    if (!orders || orders.length === 0) {
        console.log(`⚠️  Sin órdenes de ${channel} para insertar`);
        return { new: 0, updated: 0, total: 0 };
    }

    let newCount = 0;
    let updatedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const orderIds = batch.map(o => o.order_id);

        // 1. Verificar cuáles ya existen
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=order_id&channel=eq.${channel}&order_id=in.(${orderIds.join(',')})`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
        });

        const existingRows = checkRes.ok ? await checkRes.json() : [];
        const existingIds = new Set(existingRows.map(r => r.order_id));

        const batchNew = batch.filter(o => !existingIds.has(o.order_id)).length;
        const batchUpdated = batch.length - batchNew;

        newCount += batchNew;
        updatedCount += batchUpdated;

        process.stdout.write(`\r   Procesando ${Math.min(i + batchSize, orders.length)}/${orders.length} (Nuevas: ${newCount}, Actualizadas: ${updatedCount})...`);

        // 2. Upsert
        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?on_conflict=channel,order_id`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(batch),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Supabase error: ${err.message || res.statusText}`);
        }
        await sleep(100);
    }
    console.log(`\r   ✅ ${channel}: ${newCount} nuevas, ${updatedCount} actualizadas (${orders.length} total)\n`);
    return { new: newCount, updated: updatedCount, total: orders.length };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║     SYNC INCREMENTAL — Jugando y Educando        ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // 1. Determinar fecha del último pedido en Supabase
    console.log('🔍 Consultando último pedido en Supabase...');
    const lastOrderDate = await getLastOrderDate();

    // 2. Calcular DATE_FROM restando el margen de seguridad
    const lastDate = new Date(lastOrderDate);
    const fromDate = new Date(lastDate.getTime() - SAFETY_MARGIN_DAYS * 24 * 60 * 60 * 1000);
    const dateFrom = fromDate.toISOString();
    const dateTo = new Date().toISOString();

    console.log(`📅 Último pedido en BD:  ${lastDate.toISOString().split('T')[0]}`);
    console.log(`📅 Descargando desde:    ${fromDate.toISOString().split('T')[0]} (−${SAFETY_MARGIN_DAYS} días)`);
    console.log(`📅 Hasta:                ${dateTo.split('T')[0]} (hoy)`);
    console.log('📦 Canales: Mercado Libre + Wix\n');

    const startTime = Date.now();

    // 3. Fetch ML + Wix
    const mlOrders = await syncML(dateFrom, dateTo);
    const wixOrders = await syncWix(dateFrom, dateTo);

    // 4. Upsert a Supabase (sin borrar nada — merge-duplicates)
    console.log('\n💾 ═══════════════════════════════════════════');
    console.log('   GUARDANDO EN SUPABASE');
    console.log('💾 ═══════════════════════════════════════════\n');

    const mlStats = await upsertToSupabase(mlOrders, 'Mercado Libre');
    const wixStats = await upsertToSupabase(wixOrders, 'Wix');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║                  RESUMEN FINAL                   ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  ML:   ${String(mlStats.new).padStart(4)} nuevas | ${String(mlStats.updated).padStart(4)} actualizadas | Total: ${mlStats.total} ║`);
    console.log(`║  Wix:  ${String(wixStats.new).padStart(4)} nuevas | ${String(wixStats.updated).padStart(4)} actualizadas | Total: ${wixStats.total} ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Total Nuevas:       ${String(mlStats.new + wixStats.new).padStart(5)}                       ║`);
    console.log(`║  Total Actualizadas: ${String(mlStats.updated + wixStats.updated).padStart(5)}                       ║`);
    console.log(`║  Tiempo: ${elapsed}s                                ║`);
    console.log('╚══════════════════════════════════════════════════╝\n');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
