import crypto from 'crypto';

// Replica exacta del cliente para diagnóstico
function signRequest(params, apiKey) {
  const sorted = Object.keys(params).sort();
  const parts = sorted.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  const concatenated = parts.join('&');
  return crypto.createHmac('sha256', apiKey).update(concatenated).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(400).json({ error: 'Faltan credenciales', userId: !!userId, apiKey: !!apiKey });
  }

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const allParams = {
    Action: 'GetOrders',
    Format: 'JSON',
    Timestamp: timestamp,
    UserID: userId,
    Version: '2.0',
    UpdatedAfter: sixMonthsAgo.toISOString(),
    Limit: '5',
  };

  const signature = signRequest(allParams, apiKey);
  const urlParams = new URLSearchParams({ ...allParams, Signature: signature });
  const url = `https://sellercenter-api.falabella.com/?${urlParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': `${userId}/Node/18.x.x/PROPIA/FACO`,
        'accept': 'application/json',
      },
    });

    const statusCode = response.status;
    const rawText = await response.text();

    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch (_) {}

    return res.json({
      httpStatus: statusCode,
      urlUsed: url.replace(apiKey, '***').replace(encodeURIComponent(apiKey), '***'),
      userId,
      rawResponse: rawText.slice(0, 3000), // primeros 3000 chars
      parsedResponse: parsed,
    });
  } catch (err) {
    return res.status(500).json({ fetchError: err.message });
  }
}
