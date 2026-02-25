import crypto from 'crypto';

const BASE_URL = 'https://sellercenter-api.falabella.com/';

/**
 * Genera la firma HMAC-SHA256 para la API de Falabella.
 * @param {Record<string, string>} params - Todos los parámetros EXCEPTO Signature
 * @param {string} apiKey
 * @returns {string} Firma en hex
 */
function signRequest(params, apiKey) {
  const sorted = Object.keys(params).sort();
  const parts = sorted.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  const concatenated = parts.join('&');
  return crypto.createHmac('sha256', apiKey).update(concatenated).digest('hex');
}

/**
 * Realiza una solicitud a la API de Falabella.
 * @param {Object} opts
 * @param {string} opts.action - Ej: 'GetOrders'
 * @param {string} opts.version - '1.0' o '2.0'
 * @param {Record<string, string>} [opts.params] - Params adicionales (no autenticación)
 * @param {string} [opts.method] - 'GET' o 'POST'
 * @param {string} [opts.body] - Body XML para POST
 * @param {string} opts.userId
 * @param {string} opts.apiKey
 * @returns {Promise<any>} JSON data
 */
export async function falabellaRequest({ action, version = '1.0', params = {}, method = 'GET', body, userId, apiKey }) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const allParams = {
    Action: action,
    Format: 'JSON',
    Timestamp: timestamp,
    UserID: userId,
    Version: version,
    ...params,
  };

  const signature = signRequest(allParams, apiKey);

  const urlParams = new URLSearchParams({ ...allParams, Signature: signature });
  const url = `${BASE_URL}?${urlParams.toString()}`;

  const fetchOptions = {
    method: method || 'GET',
    headers: {
      'User-Agent': `${userId}/Node/18.x.x/PROPIA/FACO`,
      'accept': 'application/json',
    },
  };

  if (body) {
    fetchOptions.headers['Content-Type'] = 'text/xml; charset=UTF-8';
    fetchOptions.body = body;
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falabella API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (data.ErrorResponse) {
    const err = data.ErrorResponse.Head;
    throw new Error(`Falabella API error: ${err.ErrorMessage || err.ErrorType || JSON.stringify(err)}`);
  }

  return data;
}
