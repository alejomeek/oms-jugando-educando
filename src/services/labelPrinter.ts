import type { Order } from '@/lib/types';

export function printWixLabel(order: Order): void {
  if (order.channel !== 'wix') {
    console.warn('printWixLabel: only for Wix orders');
    return;
  }

  const { customer, shipping_address, items, order_id, total_amount, currency } = order;

  const customerName = customer.firstName && customer.lastName
    ? `${customer.firstName} ${customer.lastName}`
    : customer.email || 'Cliente';

  const address = shipping_address
    ? [
      shipping_address.receiverName || customerName,
      shipping_address.street,
      `${shipping_address.city}, ${shipping_address.state}`,
      shipping_address.zipCode,
      shipping_address.country,
    ].filter(Boolean).join('\n')
    : 'Direccion no disponible';

  const itemLines = items
    .map(item => `\u2022 ${item.title} \u00d7 ${item.quantity} @ $${item.unitPrice.toLocaleString('es-CO')} ${currency}`)
    .join('\n');

  const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const labelHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta de Envio - Pedido #${escapeHtml(order_id)}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 400px; }
    .label-box { border: 2px solid #000; padding: 16px; margin-bottom: 8px; }
    .label-title { font-size: 18px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #555; margin-top: 12px; margin-bottom: 4px; }
    .address { font-size: 14px; font-weight: bold; white-space: pre-line; line-height: 1.6; }
    .items { white-space: pre-line; font-size: 11px; color: #333; }
    .order-id { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; letter-spacing: 2px; }
    .total { font-size: 13px; font-weight: bold; margin-top: 8px; }
    .btn { padding: 8px 16px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 14px; }
    .btn-secondary { background: #6B7280; }
    .actions { margin-bottom: 16px; }
    .store-name { text-align: center; font-size: 10px; color: #888; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="no-print actions">
    <button class="btn" onclick="window.print()">Imprimir</button>
    <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
  </div>
  <div class="label-box">
    <div class="store-name">JUGANDO Y EDUCANDO</div>
    <div class="label-title">ETIQUETA DE ENVIO</div>
    <div class="section-title">N DE PEDIDO</div>
    <div class="order-id">#${escapeHtml(order_id)}</div>
    <div class="section-title">DESTINATARIO</div>
    <div class="address">${escapeHtml(address)}</div>
    <div class="section-title">ARTICULOS</div>
    <div class="items">${escapeHtml(itemLines)}</div>
    <div class="total">Total: $${total_amount.toLocaleString('es-CO')} ${escapeHtml(currency)}</div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=500,height=600');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para imprimir la etiqueta.');
    return;
  }
  printWindow.document.write(labelHtml);
  printWindow.document.close();
}
