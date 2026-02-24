# Falabella Seller Center API — Investigación

> Fuente: Perplexity AI, febrero 2026

## 1. Acceso y credenciales

- **API**: Falabella Seller Center API — portal: https://developers.falabella.com/v500/reference/getting-started
- **Autenticación**: API Key + User ID (correo de la cuenta Seller Center). No usa OAuth2.
- **Credenciales del proyecto**:
  - User ID: `germansantosmeek@gmail.com`
  - API Key: `a5b9c2b0324e79514f34b2e02c5c77fea1f189c4`
- Las credenciales son estáticas (no expiran como OAuth). Se envían en headers de cada request.
- Ambiente de certificación disponible antes de ir a producción (asociado a la cuenta seller).

## 2. Órdenes

### Endpoints conocidos
- `GET /orders` — listar órdenes, con filtros por fecha y estado, paginación
- `GET /orders/{orderId}` — detalle de una orden
- `GET /orders/{orderId}/items` — ítems de la orden (o embebidos en el detalle)

### Campos de una orden
- `OrderId`
- Datos del comprador: nombre, email, teléfono, documento
- Dirección de entrega: calle, ciudad, región, código postal
- Ítems: SKU seller, SKU Falabella, cantidad, precio unitario, total línea
- Totales: subtotal, impuestos, total, descuentos, costo de envío
- Fulfillment: tipo (by Seller / by Falabella), bodega, SLA de despacho

### Estados — mapeo al OMS
| OMS             | Falabella (aprox.)        |
|-----------------|---------------------------|
| `nuevo`         | Pending / Paid            |
| `preparando`    | Processing                |
| `enviado`       | Shipped                   |
| `entregado`     | Delivered                 |
| `cancelado`     | Cancelled                 |

- Se pueden actualizar estados desde la API (marcar como despachado, registrar tracking).

## 3. Webhooks

- Documentados en: https://developers.falabella.com/v500.0.0/reference/getwebhooks
- Eventos: nueva orden, cambio de estado de orden, cambios de producto
- Patrón recomendado: **webhooks para tiempo real + polling periódico** para reconciliación

## 4. Catálogo y stock

- API soporta crear/actualizar publicaciones de productos
- Actualización de stock en tiempo real por SKU seller
- Actualización de precios y estado publicado/no publicado
- Mapeo necesario: SKU interno del OMS ↔ SKU Falabella

## 5. Limitaciones

- Rate limits: no publicados; razonables para operación retail diaria (según integradores)
- Disponible para Colombia: sí (Falabella MCO)
- Modelo Colombia: Fulfillment by Seller (FBS) — el seller despacha
- Documentos fiscales Colombia: `FACTURA`, `NOTA DE CREDITO`

## 6. Referencias de arquitectura OMS conocidas

- **Multivende**, **Astroselling**, **Jumpseller**, **Bsale** — todos integran con esta misma API
- Jumpseller: User ID + API Key → sincroniza productos, stock, precios y órdenes
- Flujo típico: webhooks → crear orden en OMS → actualizar estado en Falabella al despachar

## 7. Referencias técnicas

- Python client no oficial: `FalabellaAPIClient` (GitHub) — tiene `Orders.get()`, `Orders.items()`
- Doc "Requests and responses": https://developers.falabella.com/v500.0.0/reference/requests-and-responses
