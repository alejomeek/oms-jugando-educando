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
  return { status: response.status, parsed };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const targetOrderId = req.query.orderId || '1144027921';
  const timestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // GetOrderItems — for item-level status and IDs
  const itemsResult = await falabellaCall({
    Action: 'GetOrderItems',
    Format: 'JSON',
    Timestamp: timestamp(),
    UserID: userId,
    Version: '1.0',
    OrderId: String(targetOrderId),
  }, apiKey, userId);

  // GetOrders filtered to last 3 days to find the full order object (OrderNumber, NationalRegistrationNumber)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const ordersResult = await falabellaCall({
    Action: 'GetOrders',
    Format: 'JSON',
    Timestamp: timestamp(),
    UserID: userId,
    Version: '2.0',
    UpdatedAfter: threeDaysAgo.toISOString(),
    Limit: '20',
  }, apiKey, userId);

  const allOrders = ordersResult.parsed?.SuccessResponse?.Body?.Orders || [];
  const targetOrder = allOrders.find(w => String(w.Order?.OrderId) === String(targetOrderId));

  return res.json({
    targetOrderId,
    // Full order object — look for OrderNumber and NationalRegistrationNumber
    targetOrderFull: targetOrder?.Order ?? 'NOT FOUND in last 3 days',
    // Items for the order
    orderItems: itemsResult.parsed?.SuccessResponse?.Body?.OrderItems,
    // Status structure sample from first 3 orders
    statusSample: allOrders.slice(0, 3).map(w => ({
      orderId: w.Order?.OrderId,
      orderNumber: w.Order?.OrderNumber,
      nationalId: w.Order?.NationalRegistrationNumber,
      statuses: w.Order?.Statuses,
    })),
  });
}
