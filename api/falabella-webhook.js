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
  for (const p of STATUS_PRIORITY) {
    if (mapped.includes(p)) return p;
  }
  return 'nuevo';
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
    total_amount: parseFloat(order.GrandTotal || order.Price || 0),
    paid_amount: parseFloat(order.GrandTotal || order.Price || 0),
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
      unitPrice: parseFloat(item.PaidPrice || item.ItemPrice || 0),
      fullPrice: parseFloat(item.PaidPrice || item.ItemPrice || 0),
      currency: item.Currency || 'COP',
      orderItemId: item.OrderItemId?.trim(),
      packageId: item.PackageId?.trim(),
      trackingCode: item.TrackingCode?.trim() || item.TrackingCodePre?.trim(),
      variationAttributes: parseVariation(item.Variation),
    })),
    payment_info: {
      method: order.PaymentMethod?.trim(),
      status: statusArray[0] || 'pending',
      paidAmount: parseFloat(order.GrandTotal || order.Price || 0),
      shipping_cost: parseFloat(order.ShippingFeeTotal || 0),
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
  // Responder 200 inmediatamente para que Falabella no reintente
  res.status(200).json({ received: true });

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!userId || !apiKey || !supabaseUrl || !supabaseKey) {
    console.error('❌ [Falabella Webhook] Faltan variables de entorno');
    return;
  }

  try {
    const payload = req.body;
    console.log('📩 [Falabella Webhook] Payload recibido:', JSON.stringify(payload));

    // Extraer OrderIds del payload
    let orderIds = [];

    if (payload.OrderId) {
      orderIds = [].concat(payload.OrderId).map(String);
    } else if (payload.order_id) {
      orderIds = [String(payload.order_id)];
    }

    if (orderIds.length === 0) {
      console.warn('⚠️  [Falabella Webhook] No se encontraron OrderIds en el payload');
      return;
    }

    for (const orderId of orderIds) {
      try {
        // Obtener datos de la orden
        const orderData = await falabellaRequest({
          action: 'GetOrders',
          version: '2.0',
          params: { OrderId: orderId },
          userId,
          apiKey,
        });

        const rawOrder = [].concat(orderData.SuccessResponse?.Body?.Orders?.Order || [])[0];
        if (!rawOrder) {
          console.warn(`⚠️  [Falabella Webhook] Orden ${orderId} no encontrada`);
          continue;
        }

        // Obtener items
        const itemsData = await falabellaRequest({
          action: 'GetMultipleOrderItems',
          version: '1.0',
          params: { OrderIdList: JSON.stringify([orderId]) },
          userId,
          apiKey,
        });

        const ordersWithItems = [].concat(itemsData.SuccessResponse?.Body?.Orders?.Order || []);
        const orderWithItems = ordersWithItems.find(o => String(o.OrderId) === orderId);
        const items = orderWithItems ? [].concat(orderWithItems.OrderItems?.OrderItem || []) : [];

        const normalized = normalizeFalabellaOrderWithItems(rawOrder, items);

        // Upsert en Supabase vía REST API
        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(normalized),
        });

        if (!upsertRes.ok) {
          const errText = await upsertRes.text();
          console.error(`❌ [Falabella Webhook] Error upsert orden ${orderId}: ${errText}`);
        } else {
          console.log(`✅ [Falabella Webhook] Orden ${orderId} actualizada`);
        }
      } catch (err) {
        console.error(`❌ [Falabella Webhook] Error procesando orden ${orderId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ [Falabella Webhook] Error general:', err.message);
  }
}
