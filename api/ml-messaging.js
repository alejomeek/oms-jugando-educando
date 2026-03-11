/**
 * Vercel Serverless Function: Mensajería ML
 * action=messages → conversación de un pack
 * action=unread   → packs con mensajes no leídos del vendedor
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, accessToken, refreshToken, clientId, clientSecret, packId, sellerId } = req.body || {};

  if (!accessToken) return res.status(400).json({ error: 'Missing required parameter: accessToken' });
  if (!action) return res.status(400).json({ error: 'Missing required parameter: action' });

  async function doRefreshToken() {
    const r = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });
    const data = await r.json();
    return data.access_token || null;
  }

  async function mlFetch(url, token, isRetry = false) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401 && !isRetry) {
      const newToken = await doRefreshToken();
      if (newToken) return mlFetch(url, newToken, true);
    }
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`ML API ${r.status}: ${text}`);
    }
    return r.json();
  }

  try {
    if (action === 'messages') {
      if (!packId || !sellerId) return res.status(400).json({ error: 'Missing packId or sellerId' });
      const url = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${sellerId}?tag=post_sale&mark_as_read=false`;
      const data = await mlFetch(url, accessToken);
      return res.json({
        success: true,
        messages: data.messages || [],
        conversation_status: data.conversation_status || null,
        paging: data.paging || null,
      });
    }

    if (action === 'unread') {
      const url = 'https://api.mercadolibre.com/marketplace/messages/unread?role=seller&tag=post_sale';
      const data = await mlFetch(url, accessToken);
      const unreadMap = {};
      for (const item of data.results || []) {
        const pid = item.resource?.replace('/packs/', '') || null;
        if (pid) unreadMap[pid] = item.count;
      }
      return res.json({ success: true, unreadMap });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    return res.status(500).json({ error: 'ML messaging error', message: error.message });
  }
}
