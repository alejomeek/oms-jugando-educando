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

  const timestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Search all orders (6 months, up to 3 pages = 300 orders) to find these specific OrderNumbers
  const TARGET_ORDER_NUMBERS = ['3214327430', '3212879369', '21019387380'];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const found = {};
  let offset = 0;
  const pageLimit = 100;

  for (let page = 0; page < 3; page++) {
    const result = await falabellaCall({
      Action: 'GetOrders',
      Format: 'JSON',
      Timestamp: timestamp(),
      UserID: userId,
      Version: '2.0',
      UpdatedAfter: sixMonthsAgo.toISOString(),
      Limit: String(pageLimit),
      Offset: String(offset),
    }, apiKey, userId);

    const orders = result.parsed?.SuccessResponse?.Body?.Orders || [];
    if (!orders.length) break;

    for (const wrapper of orders) {
      const o = wrapper.Order;
      if (TARGET_ORDER_NUMBERS.includes(String(o?.OrderNumber))) {
        found[String(o.OrderNumber)] = {
          orderNumber: o.OrderNumber,
          orderId: o.OrderId,
          statuses: o.Statuses,
          createdAt: o.CreatedAt,
          updatedAt: o.UpdatedAt,
          shippingType: o.ShippingType,
          grandTotal: o.GrandTotal,
          // raw status string extracted
          rawStatusValues: Array.isArray(o.Statuses)
            ? o.Statuses.map(s => s.Status)
            : [o.Statuses?.Status],
        };
      }
    }

    const totalCount = parseInt(result.parsed?.SuccessResponse?.Head?.TotalCount || '0', 10);
    offset += pageLimit;
    if (offset >= Math.min(totalCount, 300)) break;
    if (Object.keys(found).length === TARGET_ORDER_NUMBERS.length) break;
  }

  // For any found orders, also get their items to see item-level status
  const itemsByOrderNumber = {};
  for (const [orderNumber, order] of Object.entries(found)) {
    const itemsResult = await falabellaCall({
      Action: 'GetOrderItems',
      Format: 'JSON',
      Timestamp: timestamp(),
      UserID: userId,
      Version: '1.0',
      OrderId: String(order.orderId),
    }, apiKey, userId);
    const rawItems = itemsResult.parsed?.SuccessResponse?.Body?.OrderItems?.OrderItem;
    itemsByOrderNumber[orderNumber] = rawItems
      ? [].concat(rawItems).map(i => ({ status: i.Status, sku: i.Sku, name: i.Name }))
      : itemsResult.parsed?.ErrorResponse?.Head ?? 'error';
  }

  return res.json({
    searched: TARGET_ORDER_NUMBERS,
    foundCount: Object.keys(found).length,
    orders: found,
    itemStatuses: itemsByOrderNumber,
    // Show all distinct status values found across all fetched orders (to map any missing ones)
    note: 'rawStatusValues shows what Falabella actually returns — if not in mapping it falls back to nuevo',
  });
}
