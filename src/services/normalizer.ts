import type { MLOrder, WixOrder, Order } from '@/lib/types';

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
    total_amount: wixOrder.priceSummary.total,
    paid_amount: wixOrder.priceSummary.total,
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
      sku: item.sku || item.id,
      title:
        item.productName?.translated ||
        item.productName?.original ||
        'Sin nombre',
      quantity: item.quantity,
      unitPrice: item.price,
      fullPrice: item.totalPrice,
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
