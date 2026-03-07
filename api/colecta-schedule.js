/**
 * Vercel Serverless Function: Horario de Colecta (cross_docking) de hoy
 *
 * Endpoint ML: GET /users/{sellerId}/shipping/schedule/cross_docking
 * Responde con la ventana de pickup de hoy: { from, to, cutoff }
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getTodayKeyBogota() {
  // Bogotá = UTC-5
  const bogotaDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return DAYS[bogotaDate.getUTCDay()];
}

async function refreshMLToken(config) {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }),
  });
  if (!response.ok) throw new Error('Error al refrescar token ML');
  const data = await response.json();
  return data.access_token;
}

async function fetchSchedule(accessToken, sellerId) {
  const response = await fetch(
    `https://api.mercadolibre.com/users/${sellerId}/shipping/schedule/cross_docking`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return { response, data: response.ok ? await response.json() : null };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { config } = req.body;

    if (!config?.accessToken || !config?.sellerId) {
      return res.status(400).json({ error: 'Faltan credenciales de Mercado Libre' });
    }

    let accessToken = config.accessToken;
    let { response, data } = await fetchSchedule(accessToken, config.sellerId);

    // Token expirado → refresh y reintentar
    if (response.status === 401 && config.refreshToken && config.clientId && config.clientSecret) {
      accessToken = await refreshMLToken(config);
      ({ response, data } = await fetchSchedule(accessToken, config.sellerId));
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error al obtener horario de Colecta de ML' });
    }

    const dayKey = getTodayKeyBogota();
    const todaySchedule = data?.schedule?.[dayKey];

    if (!todaySchedule?.work || !todaySchedule?.detail?.length) {
      return res.json({ slots: [], dayKey });
    }

    const slots = todaySchedule.detail
      .filter(s => s.facility_id === 'COXBG1')
      .map(s => ({ from: s.from, to: s.to, cutoff: s.cutoff }));

    return res.json({ slots, dayKey });

  } catch (error) {
    console.error('[colecta-schedule] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
