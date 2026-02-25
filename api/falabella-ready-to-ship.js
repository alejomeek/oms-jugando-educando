import { falabellaRequest } from './_falabella-client.js';

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

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(500).json({ error: 'Faltan credenciales de Falabella' });
  }

  const { orderItemIds, packageId } = req.body;

  if (!orderItemIds || !orderItemIds.length || !packageId) {
    return res.status(400).json({ error: 'Se requieren orderItemIds y packageId' });
  }

  try {
    const data = await falabellaRequest({
      action: 'SetStatusToReadyToShip',
      version: '1.0',
      params: {
        OrderItemIds: JSON.stringify(orderItemIds),
        PackageId: String(packageId),
      },
      method: 'POST',
      userId,
      apiKey,
    });

    return res.json({ success: true, data });

  } catch (error) {
    console.error('❌ [Falabella ReadyToShip] Error:', error.message);
    return res.status(500).json({ error: 'Error al marcar como listo para envío', message: error.message });
  }
}
