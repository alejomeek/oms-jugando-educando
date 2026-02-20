export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shipment_id } = req.query;
    if (!shipment_id) return res.status(400).json({ error: 'Falta shipment_id' });

    try {
        const ML_CLIENT_ID = process.env.VITE_ML_CLIENT_ID;
        const ML_CLIENT_SECRET = process.env.VITE_ML_CLIENT_SECRET;
        const ML_REFRESH_TOKEN = process.env.VITE_ML_REFRESH_TOKEN;

        // 1. Refrescar el token al vuelo siempre garantiza no tener rechazo de permisos
        const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: ML_CLIENT_ID,
                client_secret: ML_CLIENT_SECRET,
                refresh_token: ML_REFRESH_TOKEN,
            }),
        });

        if (!tokenRes.ok) {
            throw new Error(`Token refresh failed: ${tokenRes.statusText}`);
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // 2. Traer el archivo PDF del endpoint restringido
        const pdfRes = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipment_id}&response_type=pdf`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!pdfRes.ok) {
            const err = await pdfRes.text();
            throw new Error(`Error descargando etiqueta: ${pdfRes.status} - ${err}`);
        }

        const buffer = await pdfRes.arrayBuffer();

        // 3. Devolver los bytes directamente al navegador del usuario
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="etiqueta_ML_${shipment_id}.pdf"`);
        res.status(200).send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error descargando etiqueta ML:', error.message);
        res.status(500).json({ error: error.message });
    }
}
