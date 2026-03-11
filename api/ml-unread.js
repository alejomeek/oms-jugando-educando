/**
 * Vercel Serverless Function: Obtener packs con mensajes no leídos del vendedor
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { accessToken, refreshToken, clientId, clientSecret } = req.body || {};

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing required parameter: accessToken' });
  }

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

  async function fetchUnread(token, isRetry = false) {
    const url = 'https://api.mercadolibre.com/marketplace/messages/unread?role=seller&tag=post_sale';
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (r.status === 401 && !isRetry) {
      const newToken = await doRefreshToken();
      if (newToken) return fetchUnread(newToken, true);
    }

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`ML API ${r.status}: ${text}`);
    }

    return r.json();
  }

  try {
    const data = await fetchUnread(accessToken);

    // Transformar: [{ resource: "/packs/123", count: 2 }] → { "123": 2 }
    const unreadMap = {};
    for (const item of data.results || []) {
      const packId = item.resource?.replace('/packs/', '') || null;
      if (packId) unreadMap[packId] = item.count;
    }

    return res.json({ success: true, unreadMap });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch unread messages', message: error.message });
  }
}
