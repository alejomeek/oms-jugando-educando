import { falabellaRequest } from './_falabella-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(500).json({ error: 'Faltan credenciales de Falabella' });
  }

  const { order_item_ids } = req.query;

  if (!order_item_ids) {
    return res.status(400).json({ error: 'Parámetro order_item_ids requerido' });
  }

  try {
    const ids = order_item_ids.split(',').map(id => id.trim()).filter(Boolean);

    const data = await falabellaRequest({
      action: 'GetDocument',
      version: '1.0',
      params: {
        DocumentType: 'shippingParcel',
        OrderItemIds: JSON.stringify(ids.map(Number)),
      },
      userId,
      apiKey,
    });

    const document = data.SuccessResponse?.Body?.Document;
    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const base64Data = document.File;
    const mimeType = document.MimeType || 'application/pdf';
    const fileBuffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta_${order_item_ids}.pdf"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);

  } catch (error) {
    console.error('❌ [Falabella Label] Error:', error.message);
    return res.status(500).json({ error: 'Error al obtener etiqueta', message: error.message });
  }
}
