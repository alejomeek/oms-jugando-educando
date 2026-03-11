/**
 * Vercel Serverless Function: Obtener mensajes de una conversación ML (pack)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { accessToken, refreshToken, clientId, clientSecret, packId, sellerId } = req.body || {};

  if (!accessToken || !packId || !sellerId) {
    return res.status(400).json({ error: 'Missing required parameters: accessToken, packId, sellerId' });
  }

  async function doRefreshToken(currentToken) {
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

  async function fetchMessages(token, isRetry = false) {
    const url = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${sellerId}?tag=post_sale&mark_as_read=false`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (r.status === 401 && !isRetry) {
      const newToken = await doRefreshToken(token);
      if (newToken) return fetchMessages(newToken, true);
    }

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`ML API ${r.status}: ${text}`);
    }

    return r.json();
  }

  try {
    const data = await fetchMessages(accessToken);
    return res.json({
      success: true,
      messages: data.messages || [],
      conversation_status: data.conversation_status || null,
      paging: data.paging || null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
}
