/**
 * Vercel Serverless Function: Horario de Colecta (cross_docking)
 *
 * Endpoint ML: GET /users/{sellerId}/shipping/schedule/cross_docking
 * Retorna:
 *   slots        — ventanas de pickup de HOY (vacío en fin de semana)
 *   prevCutoffISO — hora de corte del último día hábil anterior (UTC ISO),
 *                   usada como inicio de ventana en la card CEDI
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getBogotaNow() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000); // UTC proxy de Bogotá
}

function getTodayKeyBogota() {
  return DAYS[getBogotaNow().getUTCDay()];
}

/** Índice del día hábil anterior (lun–vie) */
function getPrevBusinessDayIdx(todayIdx) {
  if (todayIdx === 0 || todayIdx === 1) return 5; // Dom/Lun → Vie
  return todayIdx - 1;
}

/** Días de calendario hacia atrás hasta el día hábil anterior */
function getDaysBackToPrevBusiness(todayIdx) {
  if (todayIdx === 0) return 2; // Dom → Vie (2 días)
  if (todayIdx === 1) return 3; // Lun → Vie (3 días)
  return 1;                     // Mar–Sáb → ayer
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

/** Convierte "HH:mm" Bogotá en un Date UTC del día indicado (daysBack días atrás) */
function bogotaCutoffToISO(cutoffHHmm, bogotaNow, daysBack) {
  const [hh, mm] = cutoffHHmm.split(':').map(Number);
  const d = new Date(bogotaNow);
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(hh + 5, mm, 0, 0); // Bogotá (UTC-5) → UTC
  return d.toISOString();
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

    const bogotaNow = getBogotaNow();
    const bogotaDay = bogotaNow.getUTCDay();

    // ── Slots de hoy ──────────────────────────────────────────────────────
    const dayKey = getTodayKeyBogota();
    const todaySchedule = data?.schedule?.[dayKey];
    const slots = (todaySchedule?.work && todaySchedule?.detail?.length)
      ? todaySchedule.detail
          .filter(s => s.facility_id === 'COXBG1')
          .map(s => ({ from: s.from, to: s.to, cutoff: s.cutoff }))
      : [];

    // ── Cutoff del día hábil anterior (ventana CEDI) ───────────────────────
    const prevDayKey = DAYS[getPrevBusinessDayIdx(bogotaDay)];
    const prevSchedule = data?.schedule?.[prevDayKey];
    let prevCutoffISO = null;

    if (prevSchedule?.work && prevSchedule?.detail?.length) {
      const prevSlots = prevSchedule.detail
        .filter(s => s.facility_id === 'COXBG1')
        .sort((a, b) => a.cutoff.localeCompare(b.cutoff));

      if (prevSlots.length > 0) {
        const daysBack = getDaysBackToPrevBusiness(bogotaDay);
        prevCutoffISO = bogotaCutoffToISO(prevSlots[prevSlots.length - 1].cutoff, bogotaNow, daysBack);
      }
    }

    return res.json({ slots, dayKey, prevCutoffISO });

  } catch (error) {
    console.error('[colecta-schedule] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
