import { readFileSync, writeFileSync } from 'fs';
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

let ML_ACCESS_TOKEN = env.VITE_ML_ACCESS_TOKEN;
const ML_REFRESH_TOKEN = env.VITE_ML_REFRESH_TOKEN;
const ML_CLIENT_ID = env.VITE_ML_CLIENT_ID;
const ML_CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;

async function refreshMLToken() {
    console.log('🔄 Refrescando token...');
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
    if (!res.ok) throw new Error('Error refresh token');
    const data = await res.json();
    ML_ACCESS_TOKEN = data.access_token;
}

const orders = [
    { type: 'Full', id: '2000015216704200' },
    { type: 'Flex', id: '2000015221452636' },
    { type: 'Colecta', id: '2000015217315898' }
];

async function run() {
    await refreshMLToken();

    for (const ord of orders) {
        console.log(`\n🔍 Fetching Order ${ord.type} (${ord.id})...`);
        const oRes = await fetch(`https://api.mercadolibre.com/orders/${ord.id}`, {
            headers: { Authorization: `Bearer ${ML_ACCESS_TOKEN}` }
        });
        const oData = await oRes.json();
        writeFileSync(resolve(__dirname, `order_${ord.type}.json`), JSON.stringify(oData, null, 2));

        const shipId = oData.shipping?.id;
        if (shipId) {
            console.log(`   Fetching Shipment ${shipId}...`);
            const sRes = await fetch(`https://api.mercadolibre.com/shipments/${shipId}`, {
                headers: { Authorization: `Bearer ${ML_ACCESS_TOKEN}` }
            });
            const sData = await sRes.json();
            writeFileSync(resolve(__dirname, `shipment_${ord.type}.json`), JSON.stringify(sData, null, 2));
        } else {
            console.log('   No shipping info found.');
        }
    }
    console.log('\n✅ Listos los archivos JSON.');
}

run();
