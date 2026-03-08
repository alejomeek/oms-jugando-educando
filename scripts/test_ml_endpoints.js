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
    console.log(`\n===========================================`);
    console.log(`GET ${url}`);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.status === 401) {
        await doRefreshToken();
        return f(url);
    }
    const text = await r.text();
    try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.log(text);
    }
};

async function run() {
    const sellerId = env.VITE_ML_SELLER_ID;
    await doRefreshToken();

    // Imprimir el schedule global de nuevo
    console.log('--- Horarios Globales de Cross Docking ---');
    await f(`https://api.mercadolibre.com/users/${sellerId}/shipping/schedule/cross_docking`);

    // Imprimir capacity profile (que define si están habilitados para fin de semana)
    console.log('--- Capacity Middleend ---');
    await f(`https://api.mercadolibre.com/users/${sellerId}/capacity_middleend/cross_docking`);

}

run();
