/**
 * TEST: ¿Qué datos trae /shipments/{id} de ML?
 * Uso: node scripts/test-ml-shipment.mjs
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

const ACCESS_TOKEN = env.VITE_ML_ACCESS_TOKEN;
const SELLER_ID = env.VITE_ML_SELLER_ID;
const headers = { Authorization: `Bearer ${ACCESS_TOKEN}` };

async function main() {
    // 1. Traer la primera orden para obtener el shipping_id
    console.log('📡 Obteniendo primera orden...');
    const ordersRes = await fetch(
        `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}&sort=date_desc&limit=1&offset=0`,
        { headers }
    );
    const ordersData = await ordersRes.json();
    const order = ordersData.results?.[0];
    if (!order) { console.error('❌ No se encontraron órdenes'); process.exit(1); }

    const shipmentId = order.shipping?.id;
    console.log(`\nOrden:       ${order.id}`);
    console.log(`Nickname:    ${order.buyer?.nickname}`);
    console.log(`Shipment ID: ${shipmentId}\n`);

    if (!shipmentId) { console.log('⚠️  Esta orden no tiene shipment_id'); process.exit(0); }

    // 2. Consultar el shipment
    console.log(`📡 Consultando /shipments/${shipmentId}...\n`);
    const shipRes = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        { headers }
    );
    const ship = await shipRes.json();

    if (!shipRes.ok) {
        console.error('❌ Error:', ship);
        process.exit(1);
    }

    // Mostrar el receiver_address completo
    const addr = ship.receiver_address;
    console.log('━━━ RECEIVER ADDRESS (raw) ━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(addr, null, 2));

    console.log('\n━━━ CAMPOS CLAVE ━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`receiver_name:    ${ship.receiver_address?.receiver_name ?? '—'}`);
    console.log(`receiver_phone:   ${ship.receiver_address?.receiver_phone ?? '—'}`);
    console.log(`street_name:      ${addr?.street_name ?? '—'}`);
    console.log(`street_number:    ${addr?.street_number ?? '—'}`);
    console.log(`comment:          ${addr?.comment ?? '—'}`);
    console.log(`city:             ${addr?.city?.name ?? '—'}`);
    console.log(`state:            ${addr?.state?.name ?? '—'}`);
    console.log(`country:          ${addr?.country_id ?? '—'}`);
    console.log(`zip_code:         ${addr?.zip_code ?? '—'}`);
}

main().catch(console.error);
