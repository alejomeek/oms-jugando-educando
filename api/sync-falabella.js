import { falabellaRequest } from './_falabella-client.js';

function parseFalabellaDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.replace(' ', 'T') + 'Z').toISOString();
}

function parseVariation(variation) {
  if (!variation) return [];
  try {
    const obj = JSON.parse(variation);
    return Object.entries(obj).map(([name, val]) => ({
      name,
      value: typeof val === 'object' ? val.name : String(val),
    }));
  } catch { return []; }
}

const STATUS_PRIORITY = ['entregado', 'enviado', 'preparando', 'nuevo', 'cancelado'];

function mapFalabellaStatus(statuses) {
  const mapped = [].concat(statuses).map(s => {
    const lower = s.toLowerCase();
    if (lower === 'pending') return 'nuevo';
    if (lower === 'ready_to_ship') return 'preparando';
    if (lower === 'shipped') return 'enviado';
    if (lower === 'delivered') return 'entregado';
    if (lower === 'failed' || lower === 'canceled' || lower.startsWith('return_')) return 'cancelado';
    return 'nuevo';
  });
  // Return highest priority status
  for (const p of STATUS_PRIORITY) {
    if (mapped.includes(p)) return p;
  }
  return 'nuevo';
}

function parseAmount(v) {
  return parseFloat(String(v || '0').replace(/,/g, ''));
}

function normalizeFalabellaOrderWithItems(order, items) {
  const statusArray = [].concat(order.Statuses?.Status || ['pending']);

  return {
    order_id: String(order.OrderId),
    channel: 'falabella',
    pack_id: null,
    shipping_id: null,
    status: mapFalabellaStatus(statusArray),
    order_date: parseFalabellaDate(order.CreatedAt),
    closed_date: null,
    total_amount: parseAmount(order.GrandTotal || order.Price),
    paid_amount: parseAmount(order.GrandTotal || order.Price),
    currency: items[0]?.Currency || 'COP',
    customer: {
      source: 'falabella',
      id: order.NationalRegistrationNumber || String(order.OrderId),
      firstName: order.CustomerFirstName?.trim(),
      lastName: order.CustomerLastName?.trim(),
      email: order.AddressBilling?.CustomerEmail?.trim(),
      phone: order.AddressShipping?.Phone?.trim() || order.AddressBilling?.Phone?.trim(),
    },
    shipping_address: {
      street: [order.AddressShipping?.Address1, order.AddressShipping?.Address2, order.AddressShipping?.Address3]
        .filter(Boolean).map(s => s.trim()).join(', '),
      city: order.AddressShipping?.City?.trim() || '',
      state: (order.AddressShipping?.Region?.trim() || order.AddressShipping?.Ward?.trim()) || '',
      country: order.AddressShipping?.Country?.trim() || '',
      zipCode: order.AddressShipping?.PostCode?.trim() || '',
      receiverName: [order.AddressShipping?.FirstName, order.AddressShipping?.LastName]
        .filter(Boolean).map(s => s.trim()).join(' ') || undefined,
      receiverPhone: order.AddressShipping?.Phone?.trim() || undefined,
    },
    items: items.map(item => ({
      sku: item.Sku?.trim() || item.ShopSku?.trim() || '',
      title: item.Name?.trim() || '',
      quantity: 1,
      unitPrice: parseAmount(item.PaidPrice || item.ItemPrice),
      fullPrice: parseAmount(item.PaidPrice || item.ItemPrice),
      currency: item.Currency || 'COP',
      orderItemId: item.OrderItemId?.trim(),
      packageId: item.PackageId?.trim(),
      trackingCode: item.TrackingCode?.trim() || item.TrackingCodePre?.trim(),
      variationAttributes: parseVariation(item.Variation),
    })),
    payment_info: {
      method: order.PaymentMethod?.trim(),
      status: statusArray[0] || 'pending',
      paidAmount: parseAmount(order.GrandTotal || order.Price),
      shipping_cost: parseAmount(order.ShippingFeeTotal),
      promised_shipping_time: items[0]?.PromisedShippingTime?.trim(),
    },
    tags: [order.ShippingType?.trim()].filter(Boolean),
    notes: null,
    logistic_type: order.ShippingType === 'Dropshipping' ? 'dropshipping'
                 : order.ShippingType === 'Own Warehouse' ? 'own_warehouse'
                 : null,
    store_id: order.Warehouse?.SellerWarehouseId?.trim() || null,
    store_name: order.Warehouse?.FacilityId?.trim() || null,
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('\n🔴 [Falabella] Iniciando sincronización...');

  try {
    const { config, dateFrom, limit: bodyLimit } = req.body;

    const userId = config?.userId || process.env.VITE_FALABELLA_USER_ID;
    const apiKey = config?.apiKey || process.env.VITE_FALABELLA_API_KEY;

    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'Faltan credenciales de Falabella (userId, apiKey)' });
    }

    const pageLimit = 100;
    let offset = 0;
    const allOrders = [];
    let keepGoing = true;

    // CreatedAfter o UpdatedAfter son obligatorios en la API de Falabella.
    // Si no hay fecha previa (primer sync), traemos los últimos 6 meses.
    const fallbackDate = new Date();
    fallbackDate.setMonth(fallbackDate.getMonth() - 6);
    const effectiveDate = dateFrom || fallbackDate.toISOString();
    const dateParam = { UpdatedAfter: effectiveDate };

    while (keepGoing) {
      console.log(`📡 [Falabella] Obteniendo órdenes (offset=${offset})...`);

      const data = await falabellaRequest({
        action: 'GetOrders',
        version: '2.0',
        params: {
          Limit: String(pageLimit),
          Offset: String(offset),
          ...dateParam,
        },
        userId,
        apiKey,
      });

      const body = data.SuccessResponse?.Body;
      // API returns Body.Orders as [{Order:{...}}, ...] or {Order:[...]}
      const ordersContainer = body?.Orders;
      let ordersRaw;
      if (Array.isArray(ordersContainer)) {
        ordersRaw = ordersContainer.map(w => w.Order).filter(Boolean);
      } else {
        ordersRaw = ordersContainer?.Order ? [].concat(ordersContainer.Order) : null;
      }

      if (!ordersRaw || ordersRaw.length === 0) {
        keepGoing = false;
        break;
      }

      const page = ordersRaw;
      allOrders.push(...page);

      const totalCount = parseInt(data.SuccessResponse?.Head?.TotalCount || '0', 10);

      if (page.length < pageLimit || allOrders.length >= Math.min(totalCount, 1000)) {
        keepGoing = false;
      } else {
        offset += pageLimit;
      }
    }

    console.log(`✅ [Falabella] ${allOrders.length} órdenes obtenidas`);

    if (allOrders.length === 0) {
      return res.json({ success: true, orders: [], total: 0 });
    }

    // Obtener items en batches de 20
    const allItemsByOrderId = {};
    const batchSize = 20;

    for (let i = 0; i < allOrders.length; i += batchSize) {
      const batch = allOrders.slice(i, i + batchSize);
      const orderIds = batch.map(o => o.OrderId);

      try {
        const itemsData = await falabellaRequest({
          action: 'GetMultipleOrderItems',
          version: '1.0',
          params: {
            OrderIdList: JSON.stringify(orderIds),
          },
          userId,
          apiKey,
        });

        const itemsBody = itemsData.SuccessResponse?.Body;
        const itemsContainer = itemsBody?.Orders;
        let ordersWithItems;
        if (Array.isArray(itemsContainer)) {
          ordersWithItems = itemsContainer.map(w => w.Order).filter(Boolean);
        } else {
          ordersWithItems = [].concat(itemsContainer?.Order || []);
        }

        for (const orderWithItems of ordersWithItems) {
          const orderId = String(orderWithItems.OrderId);
          const rawItems = orderWithItems.OrderItems?.OrderItem;
          allItemsByOrderId[orderId] = rawItems ? [].concat(rawItems) : [];
        }
      } catch (err) {
        console.warn(`⚠️  [Falabella] Error obteniendo items para batch: ${err.message}`);
        // Continuar con items vacíos para este batch
        batch.forEach(o => { allItemsByOrderId[String(o.OrderId)] = []; });
      }
    }

    // Normalizar
    const normalizedOrders = allOrders.map(order => {
      const orderId = String(order.OrderId);
      const items = allItemsByOrderId[orderId] || [];
      return normalizeFalabellaOrderWithItems(order, items);
    });

    console.log(`✅ [Falabella] ${normalizedOrders.length} órdenes normalizadas`);

    return res.json({
      success: true,
      orders: normalizedOrders,
      total: normalizedOrders.length,
    });

  } catch (error) {
    console.error('❌ [Falabella] Error en sincronización:', error.message);
    return res.status(500).json({
      error: 'Error al sincronizar Falabella',
      message: error.message,
    });
  }
}
