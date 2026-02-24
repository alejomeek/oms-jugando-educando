Marcar Listo para Envío
post
https://sellercenter-api.falabella.com/?Action=SetStatusToReadyToShip


SetStatusToReadyToShip. Para un artículo embalado, con número de seguimiento y con su etiqueta, cambia su estado a listo para ser enviado.

🚧
## Importante
Recuerda que esta acción no está permitida cuando el ShipmenType es Fulfillment, es decir cuando sea falabella quien administre el inventario del comercio.
Al marcar un producto como Ready to Ship, el estado de todos los productos asociados a la orden se actualizará.
Los campos de respuesta proporcionados por esta API se encuentran detallados en la siguiente tabla:

Nombre del campo	Tipo	Descripción
PurchaseOrderId	Unsigned	Identificación de Falabella Seller Center
PurchaseOrderNumber	String	Número de pedido en Falabella Seller Center
Errores
Código de error	Mensaje	Explicación
20	E020: "%s" Invalid Order Item ID	ID de artículo de pedido inválido
21	E021: OMS Api Error Occurred	Se ha producido un error en la API de OMS
23	E023: "%s" Invalid Order Item IDs	IDs de artículos de pedido inválidos
24	E024: "%s" Invalid Delivery Type	Tipo de entrega inválido
25	E025: "%s" Invalid Shipping Provider	Proveedor de envíos inválido
26	E026: "%s" Invalid Tracking Number	Número de seguimiento inválido
29	E029: Order items must be from the same order	Los artículos del pedido deben ser del mismo pedido
31	E031: Tracking ID incorrect. Example tracking ID: "%s"	El ID de seguimiento es incorrecto. Ejemplo de ID de seguimiento: "%s"
73	E073: All order items must have status Pending or Ready To Ship. (%s)	Todos los artículos del pedido deben tener el estado Pendiente o Listo para enviar. (%s)
63	E063: The tracking code %s has already been used	El código de seguimiento %s ya ha sido utilizado
91	E091: You are not allowed to set the shipment provider and tracking number and the delivery type is wrong. Please use send_to_warehouse	No puede establecer el proveedor de envíos y el número de seguimiento y el tipo de entrega es incorrecto. Por favor, utilice send_to_warehouse
94	E094: Serial numbers specified incorrectly	Los números de serie no se han especificado según uno de los formatos aceptados para el parámetro SerialNumber
95	E095: Invalid serial number format (%s)	Los números de serie deben tener de 1 a 26 caracteres; sólo se permiten letras y dígitos latinos
96	E096: Duplicate serial number among order items (%s)	Dos o más artículos del pedido compartirían un número de serie
119	E119: Some order items are not yet ready to be processed, please try again later. (%s).	Uno o más artículos del pedido no están completamente gestionados por Falabella Seller Center, por lo que aún no pueden ser procesados
121	E121: Invalid Packing ID	ID de embalaje inválido
Body Params
Action
string
required
Defaults to SetStatusToReadyToShip
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'SetStatusToReadyToShip' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error "E008: Invalid Action'.

SetStatusToReadyToShip
Format
string
required
Defaults to XML
Si se suministra, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

XML
Timestamp
date
required
La hora actual en formato ISO8601 relativo a UTC (por ejemplo, Timestamp=2015-04-01T10:00:00+02:00 para Berlín), para que las llamadas no puedan ser reproducidas por un tercero que las escuche (es decir, las llamadas demasiado lejanas en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se suministra, aparece el mensaje de error "E001: Parameter Timestamp is mandatory". Si la marca de tiempo es demasiado antigua o está en el futuro, aparece un mensaje de error "E003: Timestamp has expired".

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

OrderItemIds
array of int32s
required
Lista de artículos del pedido que deben marcarse como listos para el envío. Lista separada por comas entre corchetes. Obligatorio. GetOrderItems


ADD int32
PackageId
string
required
Defaults to PKG0002680000
Se obtiene a través del llamado al API GetOrderItem https://developers.falabella.com/v500.0.0/reference/getorderitems. En el flujo anterior se obtenía mediante api SetStatusPackagebyMarketplace

PKG0002680000
Metadata
accept
string
enum
Defaults to application/json
Generated from available response content types


application/json
Allowed:

application/json

application/xml

Request
npx api install "@linio-developers-hub/v500#1a37g1lx5md3h95yf"

import linioDevelopersHub from '@api/linio-developers-hub';

linioDevelopersHub.post_newEndpoint({
  Action: 'SetStatusToReadyToShip',
  Format: 'XML',
  PackageId: 'PKG0002680000'
}, {Action: 'SetStatusToReadyToShip'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId></RequestId>
        <RequestAction>
            SetStatusToReadyToShip
        </RequestAction>
        <ResponseType>
            OrderItems
        </ResponseType>
        <Timestamp>
            2013-08-27T14:44:13+0000
        </Timestamp>
    </Head>
    <Body>
        <OrderItems>
            <OrderItem>
                <PurchaseOrderId>
                    123456
                </PurchaseOrderId>
                <PurchaseOrderNumber>
                    ABC-123456
                </PurchaseOrderNumber>
            </OrderItem>
        </OrderItems>
    </Body>
</SuccessResponse>