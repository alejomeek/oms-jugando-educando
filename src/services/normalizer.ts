import type { MLOrder, WixOrder, FalabellaOrder, FalabellaOrderItem, Order, OrderStatus } from '@/lib/types';

/**
 * Normaliza una orden de Mercado Libre al formato unificado
 *
 * @param mlOrder - Orden en formato raw de la API de Mercado Libre
 * @returns Orden en formato normalizado (sin id, created_at, updated_at que genera la DB)
 *
 * @example
 * const mlOrders = await fetchMLOrders(config);
 * const normalized = mlOrders.map(normalizeMLOrder);
 * // Luego insertar en Supabase con upsert
 */
export function normalizeMLOrder(
  mlOrder: MLOrder
): Omit<Order, 'id' | 'created_at' | 'updated_at'> {
  return {
    order_id: mlOrder.id.toString(),
    channel: 'mercadolibre',
    pack_id: mlOrder.pack_id?.toString() || null,
    shipping_id: mlOrder.shipping?.id?.toString() || null,
    status: 'nuevo',
    order_date: mlOrder.date_created,
    closed_date: mlOrder.date_closed || null,
    total_amount: mlOrder.total_amount,
    paid_amount: mlOrder.paid_amount,
    currency: mlOrder.currency_id,
    customer: {
      source: 'mercadolibre',
      id: mlOrder.buyer.id.toString(),
      nickname: mlOrder.buyer.nickname,
    },
    shipping_address: null, // Requiere fetch adicional a /shipments/{id}
    items: mlOrder.order_items.map((item) => ({
      sku: item.item.seller_sku,
      title: item.item.title,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      fullPrice: item.full_unit_price,
      currency: item.currency_id,
      variationAttributes:
        item.item.variation_attributes?.map((attr) => ({
          name: attr.name,
          value: attr.value_name,
        })) || [],
    })),
    payment_info: mlOrder.payments?.[0]
      ? {
        method: mlOrder.payments[0].payment_method_id,
        status: mlOrder.payments[0].status,
        installments: mlOrder.payments[0].installments,
        paidAmount: mlOrder.payments[0].total_paid_amount,
        paymentDate: mlOrder.payments[0].date_approved,
      }
      : null,
    tags: mlOrder.tags || [],
    notes: null,
    logistic_type: null, // Se enriquece en sync-ml.js tras fetch a /shipments/{id}
  };
}

/**
 * Normaliza una orden de Wix al formato unificado
 *
 * @param wixOrder - Orden en formato raw de la API de Wix eCommerce
 * @returns Orden en formato normalizado (sin id, created_at, updated_at que genera la DB)
 *
 * @example
 * const { orders } = await fetchWixOrders(config);
 * const normalized = orders.map(normalizeWixOrder);
 * // Luego insertar en Supabase con upsert
 */
export function normalizeWixOrder(
  wixOrder: WixOrder
): Omit<Order, 'id' | 'created_at' | 'updated_at'> {
  return {
    order_id: wixOrder.number,
    channel: 'wix',
    pack_id: null,
    shipping_id: null,
    status: 'nuevo',
    order_date: wixOrder._createdDate,
    closed_date: wixOrder._updatedDate || null,
    total_amount: parseFloat(wixOrder.priceSummary.total.amount),
    paid_amount: parseFloat(wixOrder.priceSummary.total.amount),
    currency: wixOrder.currency,
    customer: {
      source: 'wix',
      id: wixOrder.buyerInfo.id,
      email: wixOrder.buyerInfo.email,
      firstName: wixOrder.billingInfo?.contactDetails?.firstName,
      lastName: wixOrder.billingInfo?.contactDetails?.lastName,
      phone: wixOrder.billingInfo?.contactDetails?.phone,
    },
    // La dirección de envío viene en shippingInfo.logistics.shippingDestination
    // con fallback a recipientInfo (ambos presentes en la API real)
    shipping_address: (() => {
      const dest = wixOrder.shippingInfo?.logistics?.shippingDestination;
      const addr = dest?.address ?? wixOrder.recipientInfo?.address;
      const contact = dest?.contactDetails ?? wixOrder.recipientInfo?.contactDetails;
      if (!addr) return null;
      return {
        street: [addr.addressLine, addr.addressLine2].filter(Boolean).join(', '),
        city: addr.city || '',
        state: addr.subdivisionFullname || addr.subdivision || '',
        country: addr.countryFullname || addr.country || '',
        zipCode: addr.postalCode || '',
        receiverName: contact ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : undefined,
        receiverPhone: contact?.phone,
      };
    })(),
    items: wixOrder.lineItems.map((item) => ({
      sku: item.physicalProperties?.sku || item.sku || item.id,
      title:
        item.productName?.translated ||
        item.productName?.original ||
        'Sin nombre',
      quantity: item.quantity,
      unitPrice: parseFloat(item.price.amount),
      fullPrice: parseFloat(item.totalPriceAfterTax?.amount ?? item.price.amount),
      currency: wixOrder.currency,
      imageUrl: item.image?.url,
    })),
    payment_info: {
      status: wixOrder.paymentStatus,
    },
    tags: [],
    notes: null,
  };
}

/**
 * Normaliza una orden de Falabella al formato unificado
 */
function parseFalabellaDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr.replace(' ', 'T') + 'Z').toISOString();
}

function parseVariationFb(variation: string | undefined | null): Array<{ name: string; value: string }> {
  if (!variation) return [];
  try {
    const obj = JSON.parse(variation) as Record<string, unknown>;
    return Object.entries(obj).map(([name, val]) => ({
      name,
      value: typeof val === 'object' && val !== null ? (val as Record<string, string>).name : String(val),
    }));
  } catch { return []; }
}

const FB_STATUS_PRIORITY = ['entregado', 'enviado', 'preparando', 'nuevo', 'cancelado'] as const;

function mapFalabellaStatus(statuses: string[]): OrderStatus {
  const mapped = statuses.map(s => {
    const lower = s.toLowerCase();
    if (lower === 'pending') return 'nuevo' as const;
    if (lower === 'ready_to_ship') return 'preparando' as const;
    if (lower === 'shipped') return 'enviado' as const;
    if (lower === 'delivered') return 'entregado' as const;
    if (lower === 'failed' || lower === 'canceled' || lower.startsWith('return_')) return 'cancelado' as const;
    return 'nuevo' as const;
  });
  for (const p of FB_STATUS_PRIORITY) {
    if (mapped.includes(p)) return p;
  }
  return 'nuevo';
}

export function normalizeFalabellaOrder(
  order: FalabellaOrder,
  items: FalabellaOrderItem[]
): Omit<Order, 'id' | 'created_at' | 'updated_at'> {
  const statusArray = ([] as string[]).concat(order.Statuses?.Status as string | string[] || ['pending']);

  return {
    order_id: String(order.OrderId),
    channel: 'falabella',
    pack_id: null,
    shipping_id: null,
    status: mapFalabellaStatus(statusArray),
    order_date: parseFalabellaDate(order.CreatedAt) ?? new Date().toISOString(),
    closed_date: null,
    total_amount: parseFloat(order.GrandTotal || order.Price || '0'),
    paid_amount: parseFloat(order.GrandTotal || order.Price || '0'),
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
        .filter(Boolean).map(s => (s as string).trim()).join(', '),
      city: order.AddressShipping?.City?.trim() || '',
      state: order.AddressShipping?.Region?.trim() || order.AddressShipping?.Ward?.trim() || '',
      country: order.AddressShipping?.Country?.trim() || '',
      zipCode: order.AddressShipping?.PostCode?.trim() || '',
      receiverName: [order.AddressShipping?.FirstName, order.AddressShipping?.LastName]
        .filter(Boolean).map(s => (s as string).trim()).join(' ') || undefined,
      receiverPhone: order.AddressShipping?.Phone?.trim() || undefined,
    },
    items: items.map(item => ({
      sku: item.Sku?.trim() || item.ShopSku?.trim() || '',
      title: item.Name?.trim() || '',
      quantity: 1,
      unitPrice: parseFloat(item.PaidPrice || item.ItemPrice || '0'),
      fullPrice: parseFloat(item.PaidPrice || item.ItemPrice || '0'),
      currency: item.Currency || 'COP',
      orderItemId: item.OrderItemId?.trim(),
      packageId: item.PackageId?.trim(),
      trackingCode: item.TrackingCode?.trim() || item.TrackingCodePre?.trim(),
      variationAttributes: parseVariationFb(item.Variation),
    })),
    payment_info: {
      method: order.PaymentMethod?.trim(),
      status: statusArray[0] || 'pending',
      paidAmount: parseFloat(order.GrandTotal || order.Price || '0'),
      shipping_cost: parseFloat(order.ShippingFeeTotal || '0'),
      promised_shipping_time: items[0]?.PromisedShippingTime?.trim(),
    },
    tags: [order.ShippingType?.trim()].filter(Boolean) as string[],
    notes: null,
    logistic_type: order.ShippingType === 'Dropshipping' ? 'dropshipping'
                 : order.ShippingType === 'Own Warehouse' ? 'own_warehouse'
                 : null,
    store_id: order.Warehouse?.SellerWarehouseId?.trim() || null,
    store_name: order.Warehouse?.FacilityId?.trim() || null,
  };
}
