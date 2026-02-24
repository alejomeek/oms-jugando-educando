Consultar Items
get
https://sellercenter-api.falabella.com/?Action=GetOrderItems

GetOrderItems. A través de un OrderId devuelve en detalle los artículos asociados de una orden.

El endpoint GetOrderItems de la API de Falabella Seller Center permite a los vendedores recuperar información detallada sobre los artículos asociados a una orden específica. Al proporcionar un OrderId, este endpoint devuelve detalles como el identificador del artículo, nombre del producto, cantidad, precio y otros atributos relevantes. Esta funcionalidad es esencial para la gestión eficiente de pedidos, permitiendo a los vendedores acceder a información precisa y actualizada sobre los productos comprados por los clientes


Respuesta
Nombre	Tipo	Descripción
OrderNumber	String	Número de pedido mostrado al cliente final
OrderItemId	String	Identificador único para cada artículo del pedido
ShopId	String	Identificador único de la tienda que vendió el artículo (Falabella o Sodimac)
OrderId	String	El mismo ID de pedido al que pertenece el artículo
Name	String	Nombre del producto
Sku	String	Stock-keeping Unit del producto
Variation	String	Variaciones del producto (como tamaño, color, etc.)
ShopSku	String	SKU específico de la tienda para el producto
ShippingType	String	Método de envío utilizado, puede tener dos valores Dropshipping (Fulfiillment by Seller) y Fulfillment (FulFillment by Falabella)
Currency	String	Moneda utilizada para la transacción. Depende de país Chile: CLP, Perú: PEN, Colombia: COP
VoucherCode	String	Código de cupón aplicado al artículo (solo si aplica)
Status	String	Estado actual del artículo del pedido, posibles valores: pending, ready_to_ship, shipped, delivered, canceled, failed_delivery, return_shipped_by_customer, return_waiting_for_approval, return_rejected, returned
isProcessable	String	Indica si el artículo puede ser procesado (0 o 1)
ShipmentProvider	String	Nombre del proveedor de envío
IsDigital	String	Indica si el artículo es un producto digital (0 o 1)
DigitalDeliveryInfo	String	Información sobre el método de entrega digital (si aplica)
TrackingCode	String	Código de seguimiento para rastreo del envío
TrackingCodePre	String	Código de seguimiento pre-generado antes de iniciar el envío
Reason	String	Motivo de cancelación o devolución (si aplica)
ReasonDetail	String	Razón detallada para la cancelación o devolución (si aplica)
PurchaseOrderId	String	ID de orden de compra generado por la plataforma
PurchaseOrderNumber	String	Número de orden de compra proporcionado al vendedor
PackageId	String	ID de paquete único que contiene los artículos
PromisedShippingTime	String	Tiempo de envío estimado prometido al cliente
ExtraAttributes	String	Atributos adicionales relacionados con el artículo del pedido
ShippingProviderType	String	indica el nivel de servicio según la velocidad de entrega. Los valores posibles son: Same day, Direct, Click & Collect, Next Day, Home Delivery y Regular.
CreatedAt	String	Marca de tiempo cuando se creó el artículo del pedido (formato ISO)
UpdatedAt	String	Marca de tiempo cuando se actualizó por última vez el artículo del pedido (formato ISO)
Vouchers	String	Lista de cupones aplicados al artículo
SalesType	String	Tipo de venta, por ahora solo puede tener valor TDR.
ReturnStatus	String	Estado de la solicitud de devolución, si la hay (por ejemplo, Pendiente, Aprobada)
WalletCredits	String	Cantidad de créditos de billetera utilizados para este pedido
ItemPrice	String	Precio original del artículo antes de descuentos o cupones
PaidPrice	String	Precio pagado por el cliente final después de descuentos
TaxAmount	String	Importe del impuesto aplicado al artículo
CodCollectableAmount	String	Monto a cobrar en caso de pago contra entrega (COD)
ShippingAmount	String	Importe total de envío cobrado por el artículo
ShippingServiceCost	String	Costo real del servicio de envío
ShippingTax	String	Importe del impuesto cobrado sobre el envío
VoucherAmount	String	Descuento total aplicado a través de cupones

Errores
Código de Error	Mensaje
16	E016: "%s" Invalid Order ID (ID de pedido inválido)
Metadata
Action
string
required
Defaults to GetOrderItems
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetOrderItems' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Invalid Action'.

GetOrderItems
Format
string
enum
required
Defaults to XML
Si se suministra, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".


XML
Allowed:

XML

JSON
Timestamp
date
required
La hora actual en formato ISO8601 relativo a UTC (por ejemplo, Timestamp=2015-04-01T10:00:00+02:00 para Berlín), para que las llamadas no puedan ser reproducidas por un tercero que las escuche (es decir, las llamadas demasiado lejanas en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se suministra, aparece el mensaje de error "E001: Parameter Timestamp is mandatory". Si la marca de tiempo es demasiado antigua o está en el futuro, aparece un mensaje de error "E003: Timestamp has expired'.

UserID
string
required
El ID del usuario que realiza la llamada. La lista de usuarios autorizados se mantiene en la interfaz web de Seller Center en Configuración/Gestión de usuarios.

Version
string
required
La versión de la API contra la que se va a ejecutar esta llamada, en formato mayor-punto-menor. Debe ser actualmente 1.0, aunque la versión real de la API sea 2.6.20. Si se omite, se devuelve un mensaje de error 'E001: Parameter Version is mandatory'.

Signature
string
required
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.

OrderId
int32
required
El identificador de la orden que fue asignado a la orden por SellerCenter. Más información sobre IDs de órdenes en Órdenes.

accept
string
enum
Defaults to application/json
Generated from available response content types


application/json
Allowed:

application/json

application/xml

REQUEST:
npx api install "@linio-developers-hub/v500#1a37g1lx5md3h95yf"
import linioDevelopersHub from '@api/linio-developers-hub';

linioDevelopersHub.getqcstatus({Action: 'GetOrderItems', Format: 'XML'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
{
  "SuccessResponse": {
    "Head": {
      "RequestId": "",
      "RequestAction": "GetOrderItems",
      "ResponseType": "OrderItems",
      "Timestamp": "2025-03-21T13:16:33-03:00"
    },
    "Body": {
      "OrderItems": {
        "OrderItem": {
          "OrderItemId": "101311982",
          "ShopId": "55ecb588-ca44-4048-a90d-44d5db1441cd",
          "OrderId": "1001687807",
          "Name": "Test Product Imports single varjkesjfkd Upate ejsfdbj",
          "Sku": "2521154701",
          "Variation": "{}",
          "ShopSku": "101180097",
          "ShippingType": "Dropshipping",
          "Currency": "COP",
          "VoucherCode": "",
          "Status": "pending",
          "IsProcessable": "1",
          "ShipmentProvider": "ibis",
          "IsDigital": "0",
          "DigitalDeliveryInfo": "",
          "TrackingCode": "800026611544860011",
          "TrackingCodePre": "",
          "Reason": "",
          "ReasonDetail": "",
          "PurchaseOrderId": "",
          "PurchaseOrderNumber": "",
          "PackageId": "PKG0000003530",
          "PromisedShippingTime": "2025-03-13 09:54:00",
          "ExtraAttributes": "{\"itemId\":\"1\",\"originNode\":\"dd195146-c5ef-496d-a7b1-35ff91bc3793\",\"deliveryOrderGroupId\":\"149000450866\"}",
          "ShippingProviderType": "regular",
          "CreatedAt": "2025-03-12 12:26:18",
          "UpdatedAt": "2025-03-12 12:26:31",
          "Vouchers": "",
          "SalesType": "TDR",
          "ReturnStatus": "",
          "WalletCredits": "0.00",
          "ItemPrice": "3521.00",
          "PaidPrice": "3521.00",
          "TaxAmount": "0.00",
          "CodCollectableAmount": "0.00",
          "ShippingAmount": "15900.00",
          "ShippingServiceCost": "0.00",
          "ShippingTax": "0.00",
          "VoucherAmount": "0.00"
        }
      }
    }
  }
}