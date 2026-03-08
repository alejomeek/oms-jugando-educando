import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)/);
    if (match) acc[match[1]] = match[2];
    return acc;
}, {});

let accessToken = env.VITE_ML_ACCESS_TOKEN;

async function doRefreshToken() {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: env.VITE_ML_CLIENT_ID,
            client_secret: env.VITE_ML_CLIENT_SECRET,
            refresh_token: env.VITE_ML_REFRESH_TOKEN,
        }),
    });
    const data = await response.json();
    accessToken = data.access_token;
}

const f = async (url) => {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.status === 401) {
        await doRefreshToken();
        return f(url);
    }
    const text = await r.text();
    if (!r.ok) {
        console.log(`Failed ${url}: ${r.status} ${text}`);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};

async function run() {
    await doRefreshToken();

    const orderId = '2000015445583876';
    console.log(`Buscando Orden ${orderId}...`);

    const order = await f(`https://api.mercadolibre.com/orders/${orderId}`);
    if (!order) {
        console.log("No se encontro la orden");
        return;
    }

    const shippingId = order.shipping?.id;
    if (!shippingId) {
        console.log("Orden no tiene shipping ID");
        return;
    }

    const o = order; // keep o named reference since we use it below

    const shipment = await f(`https://api.mercadolibre.com/shipments/${shippingId}`);
    if (!shipment) return;

    if (shipment.logistic_type !== 'cross_docking') {
        console.log(`Logistics type is ${shipment.logistic_type}, not cross docking`);
    }

    console.log(`\n\n--- Orden Cross Docking: ${o.id} ---`);
    console.log(`Shipping ID: ${shippingId}`);
    console.log(`Logistics type: ${shipment.logistic_type}`);

    const result = {
        id: shipment.id,
        status: shipment.status,
        substatus: shipment.substatus,
        shipping_mode: shipment.mode,
        shipping_option: shipment.shipping_option,
        status_history: shipment.status_history,
    };

    console.log("Shipment details relevant to scheduling:", JSON.stringify(result, null, 2));

    console.log("\n\n--- Order Object Details ---");
    const orderDetails = {
        status: o.status,
        date_created: o.date_created,
        date_closed: o.date_closed,
        expiration_date: o.expiration_date,
        shipping_cost: o.shipping_cost
    };
    console.log(JSON.stringify(orderDetails, null, 2));

}

run();
