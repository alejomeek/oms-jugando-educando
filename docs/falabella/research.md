# Falabella Seller Center API — Contexto General

> Leer este archivo primero antes de revisar los endpoints.

## Credenciales (Colombia)

- **User ID**: `germansantosmeek@gmail.com`
- **API Key**: `a5b9c2b0324e79514f34b2e02c5c77fea1f189c4`
- **Base URL**: `https://sellercenter-api.falabella.com/`
- **Autenticación**: ver `Certificando_las_solicitudes.md`

## ⚠️ Usar siempre JSON, nunca XML

La API devuelve XML por defecto. **Siempre agregar `Format=JSON`** en todos los requests para recibir JSON. El parámetro `accept: application/json` también aplica en los headers.

## Alcance de esta integración

- Canal: `'falabella'` en la tabla `orders` de Supabase
- **Incluye**: sync de órdenes, webhooks, marcar listo para envío, obtener etiqueta, tracking
- **No incluye**: sync de catálogo/productos, stock, feeds, documentos tributarios

## Mapeo de estados Falabella → OMS

Los estados exactos de Falabella deben extraerse de `Flujos_de_Órdenes.md`. Construir el mapeo a los estados del OMS (`nuevo`, `preparando`, `enviado`, `entregado`, `cancelado`) basándose en esa documentación.

## Modelo de fulfillment

- **`Dropshipping`** (ShippingType): Fulfillment by Seller — el seller despacha desde su bodega. Este es nuestro caso.
- **`own_warehouse`**: Fulfillment by Falabella — Falabella despacha en nombre del seller.

## Arquitectura de órdenes en Falabella

Una orden (`Order`) contiene múltiples ítems (`OrderItems`). Los ítems se consultan por separado via `GetMultipleOrderItems`. Cada ítem tiene su propio estado — el estado de la orden es el conjunto de estados únicos de sus ítems (`Statuses`).

## Documentación disponible en esta carpeta

| Archivo | Propósito |
|---|---|
| `Certificando_las_solicitudes.md` | Cómo construir la firma SHA256 y los headers |
| `Opera_con_Nuestras_APIs.md` | Estructura general de requests/responses |
| `Flujos_de_Órdenes.md` | Ciclo de vida completo de una orden |
| `Webhooks.md` | Configuración y payloads de webhooks |
| `Consultar_Órdenes_V2.md` | GET órdenes con filtros y paginación |
| `Consultar_Orden_V2.md` | GET detalle de una orden |
| `Consultar_Items.md` | GET ítems de una orden |
| `Consultar_Items_para_Múltiples_Órdenes.md` | GET ítems de varias órdenes en batch |
| `Marcar_Listo_para_Envío.md` | POST marcar orden como despachada |
| `Obtener_Etiqueta.md` | GET etiqueta de envío (PDF/ZPL) |
| `Consultar_Bodegas_Logísticas.md` | GET ID de bodega (requerido para despacho) |
| `Enlistar_Eventos.md` | GET eventos disponibles para webhooks |
| `Creacion_de_Webhook.md` | POST registrar webhook en Falabella |
| `Consultar_Webhook.md` | GET verificar webhook activo |
| `Eliminar_Webhook.md` | POST eliminar webhook |
