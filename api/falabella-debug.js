import crypto from 'crypto';

function signRequest(params, apiKey) {
  const sorted = Object.keys(params).sort();
  const parts = sorted.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  const concatenated = parts.join('&');
  return crypto.createHmac('sha256', apiKey).update(concatenated).digest('hex');
}

async function falabellaCall(allParams, apiKey, userId) {
  const signature = signRequest(allParams, apiKey);
  const urlParams = new URLSearchParams({ ...allParams, Signature: signature });
  const url = `https://sellercenter-api.falabella.com/?${urlParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': `${userId}/Node/18.x.x/PROPIA/FACO`,
      'accept': 'application/json',
    },
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (_) {}
  return { status: response.status, text: text.slice(0, 4000), parsed };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(400).json({ error: 'Faltan credenciales', userId: !!userId, apiKey: !!apiKey });
  }

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const targetOrderId = req.query.orderId || '1144027921';

  // Call 1: GetOrderItems for the target order
  const itemsResult = await falabellaCall({
    Action: 'GetOrderItems',
    Format: 'JSON',
    Timestamp: timestamp,
    UserID: userId,
    Version: '1.0',
    OrderId: String(targetOrderId),
  }, apiKey, userId);

  // Call 2: GetOrders with limit=5 to see raw status structure
  const timestamp2 = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const ordersResult = await falabellaCall({
    Action: 'GetOrders',
    Format: 'JSON',
    Timestamp: timestamp2,
    UserID: userId,
    Version: '2.0',
    UpdatedAfter: sixMonthsAgo.toISOString(),
    Limit: '3',
  }, apiKey, userId);

  return res.json({
    targetOrderId,
    orderItems: {
      httpStatus: itemsResult.status,
      parsed: itemsResult.parsed,
    },
    sampleOrders: {
      httpStatus: ordersResult.status,
      // Show raw Statuses structure of first few orders
      statusesPreview: ordersResult.parsed?.SuccessResponse?.Body?.Orders
        ?.slice(0, 3)
        ?.map(w => ({
          orderId: w.Order?.OrderId,
          statuses: w.Order?.Statuses,
          grandTotal: w.Order?.GrandTotal,
        })),
      rawResponse: ordersResult.text,
    },
  });
}
