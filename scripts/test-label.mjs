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

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
let ML_ACCESS_TOKEN = env.VITE_ML_ACCESS_TOKEN;
const ML_REFRESH_TOKEN = env.VITE_ML_REFRESH_TOKEN;
const ML_CLIENT_ID = env.VITE_ML_CLIENT_ID;
const ML_CLIENT_SECRET = env.VITE_ML_CLIENT_SECRET;

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
    console.log('✅ Token refrescado.');
}

async function getRecentShipment() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?channel=eq.mercadolibre&shipping_id=not.is.null&order=order_date.desc&limit=5`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const data = await res.json();
    // find the first one that has a shipping_id and isn't delivered (since delivered ones might have expired labels)
    // Actually just try the most recent ones.
    return data[0]?.shipping_id;
}

async function downloadLabel(shipmentId) {
    const res = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
        headers: {
            'Authorization': `Bearer ${ML_ACCESS_TOKEN}`
        }
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to download: ${res.status} - ${err}`);
    }

    // Save PDF
    const buffer = await res.arrayBuffer();
    const filepath = resolve(__dirname, `etiqueta_${shipmentId}.pdf`);
    writeFileSync(filepath, Buffer.from(buffer));
    console.log(`✅ Etiqueta guardada exitosamente en: ${filepath}`);
}

async function run() {
    await refreshMLToken();
    const shipmentId = await getRecentShipment();
    if (!shipmentId) {
        console.log('No se encontró ningún shipping_id reciente.');
        return;
    }
    console.log(`🔍 Intentando descargar etiqueta (PDF) del shipment: ${shipmentId}`);
    try {
        await downloadLabel(shipmentId);
    } catch (e) {
        console.error('❌ Error devolviendo PDF:', e.message);
    }
}

run();
