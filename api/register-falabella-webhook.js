import { falabellaRequest } from './_falabella-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = process.env.VITE_FALABELLA_USER_ID;
  const apiKey = process.env.VITE_FALABELLA_API_KEY;

  if (!userId || !apiKey) {
    return res.status(500).json({ error: 'Faltan credenciales de Falabella' });
  }

  const { callbackUrl } = req.body;
  if (!callbackUrl) {
    return res.status(400).json({ error: 'callbackUrl requerido' });
  }

  try {
    // 1. Obtener entidades disponibles (aliases)
    const entitiesData = await falabellaRequest({
      action: 'GetWebhookEntities',
      version: '1.0',
      userId,
      apiKey,
    });

    console.log('Webhook entities:', JSON.stringify(entitiesData.SuccessResponse?.Body));

    // 2. Crear el webhook con XML body
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Webhook>
    <CallbackUrl>${callbackUrl}</CallbackUrl>
    <Events>
      <Event>onOrderCreated</Event>
      <Event>onOrderItemsStatusChanged</Event>
    </Events>
  </Webhook>
</Request>`;

    const createData = await falabellaRequest({
      action: 'CreateWebhook',
      version: '1.0',
      method: 'POST',
      body: xmlBody,
      userId,
      apiKey,
    });

    const webhookId = createData.SuccessResponse?.Body?.WebhookId;
    return res.json({ success: true, webhookId, response: createData.SuccessResponse?.Body });

  } catch (error) {
    console.error('❌ [Register Webhook] Error:', error.message);
    return res.status(500).json({ error: 'Error al registrar webhook', message: error.message });
  }
}
