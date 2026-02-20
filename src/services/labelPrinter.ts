import type { Order } from '@/lib/types';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

async function loadLogoAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function printWixLabel(order: Order): Promise<void> {
  if (order.channel !== 'wix') {
    console.warn('printWixLabel: only for Wix orders');
    return;
  }

  const { customer, shipping_address, order_id } = order;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'cm',
    format: [10, 15],
  });

  doc.setFont('helvetica');
  let y = 0.5;

  // Logo
  try {
    const logoData = await loadLogoAsBase64('/logo.png');
    const logoWidth = 4;
    const logoHeight = 1;
    const logoX = (10 - logoWidth) / 2;
    doc.addImage(logoData, 'PNG', logoX, y, logoWidth, logoHeight);
    y += logoHeight + 0.3;
  } catch {
    // Sin logo: empezamos con encabezado directamente
  }

  // Encabezado empresa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DIDÁCTICOS JUGANDO Y EDUCANDO SAS', 5, y, { align: 'center' });
  y += 0.45;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('NIT 901,144,615-6', 5, y, { align: 'center' });
  y += 0.4;
  doc.text('CC Bulevar - Local S113, Bogotá', 5, y, { align: 'center' });
  y += 0.4;
  doc.text('Celular 3134285423', 5, y, { align: 'center' });
  y += 0.5;

  // Separador
  doc.setLineWidth(0.02);
  doc.line(0.5, y, 9.5, y);
  y += 0.6;

  // Destinatario
  const receiverName =
    shipping_address?.receiverName ||
    (customer.firstName && customer.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : customer.email || 'Destinatario');

  const phone = shipping_address?.receiverPhone || '';
  const street = shipping_address?.street || '';
  const comment = shipping_address?.comment || '';
  const city = shipping_address?.city || '';

  const maxWidth = 8.5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const nameLines = doc.splitTextToSize(`Destinatario: ${receiverName}`, maxWidth) as string[];
  nameLines.forEach((line) => {
    doc.text(line, 0.5, y);
    y += 0.5;
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (phone) {
    doc.text(`Celular: ${phone}`, 0.5, y);
    y += 0.5;
  }

  const addressText = comment ? `${street}, ${comment}` : street;
  const addressLines = doc.splitTextToSize(`Dirección: ${addressText}`, maxWidth) as string[];
  addressLines.forEach((line) => {
    doc.text(line, 0.5, y);
    y += 0.45;
  });

  if (city) {
    doc.text(`Ciudad: ${city}`, 0.5, y);
    y += 0.5;
  }

  doc.text(`Pedido: #${order_id}`, 0.5, y);

  // Código QR (esquina inferior derecha)
  try {
    const qrDataUrl = await QRCode.toDataURL(order_id, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const qrSize = 3;
    const qrX = 9.5 - qrSize - 0.5;
    const qrY = 15 - qrSize - 1;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const pedidoText = `#${order_id}`;
    const textWidth = doc.getTextWidth(pedidoText);
    doc.text(pedidoText, qrX + (qrSize - textWidth) / 2, qrY + qrSize + 0.4);
  } catch {
    // Sin QR si falla
  }

  doc.save(`WIX_${order_id}.pdf`);
}
