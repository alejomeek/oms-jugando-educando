/**
 * TEST: ¿Trae ML la cédula del comprador via /users/{buyer_id}?
 * Uso: node scripts/test-ml-buyer-id.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env.local manualmente
const envPath = resolve(__dirname, '../.env.local');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => l.split('=').map(s => s.trim()))
        .filter(([k]) => k)
        .map(([k, ...v]) => [k, v.join('=')])
);

const ACCESS_TOKEN = env.VITE_ML_ACCESS_TOKEN;
const SELLER_ID = env.VITE_ML_SELLER_ID;

if (!ACCESS_TOKEN || !SELLER_ID) {
    console.error('❌ Faltan VITE_ML_ACCESS_TOKEN o VITE_ML_SELLER_ID en .env.local');
    process.exit(1);
}

const headers = { Authorization: `Bearer ${ACCESS_TOKEN}` };

async function main() {
    console.log('📡 Obteniendo últimas 5 órdenes de ML...\n');

    const res = await fetch(
        `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}&sort=date_desc&limit=5&offset=0`,
        { headers }
    );
    const data = await res.json();

    if (!res.ok) {
        console.error('❌ Error al obtener órdenes:', data);
        process.exit(1);
    }

    const orders = data.results || [];
    console.log(`✅ ${orders.length} órdenes obtenidas\n`);

    for (const order of orders) {
        const buyerId = order.buyer.id;
        const nickname = order.buyer.nickname;

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Orden:    ${order.id}`);
        console.log(`Nickname: ${nickname}`);
        console.log(`Buyer ID: ${buyerId}`);

        // Intentar traer datos del usuario
        const userRes = await fetch(
            `https://api.mercadolibre.com/users/${buyerId}`,
            { headers }
        );
        const user = await userRes.json();

        if (!userRes.ok) {
            console.log(`Usuario:  ❌ Error ${userRes.status} - ${user.message}`);
        } else {
            console.log(`Nombre:   ${user.first_name ?? '—'} ${user.last_name ?? '—'}`);
            console.log(`Email:    ${user.email ?? '—'}`);
            console.log(`Cédula:   tipo=${user.identification?.type ?? '—'}  numero=${user.identification?.number ?? '—'}`);
        }

        console.log('');
    }
}

main().catch(console.error);
