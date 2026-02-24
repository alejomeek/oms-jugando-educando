Consultar Items para Múltiples Órdenes
get
https://sellercenter-api.falabella.com/?Action=GetMultipleOrderItems


GetMultipleOrderItems. A través de un arreglo de OrderId devuelve en detalle los artículos asociados de una orden

Este endpoint sigue el mismo principio que GetOrderItems, pero permite consultar múltiples órdenes simultáneamente utilizando distintos OrderID. Su propósito es entregar información detallada de cada ítem contenido en las órdenes consultadas.

Respuesta
Nombre	Tipo	Descripción
OrderId	String	El mismo ID de pedido al que pertenece el artículo
OrderNumber	String	Número de pedido mostrado al cliente final
OrderItems	Object	Contiene una lista de artículos del pedido
OrderItemId	String	Identificador único para cada artículo del pedido
ShopId	String	Identificador único de la tienda que vendió el artículo (Falabella o Sodimac)
OrderId	String	El mismo ID de pedido al que pertenece el artículo
Name	String	Nombre del producto
Sku	String	Stock-keeping Unit del producto
Variation	String	Variaciones del producto (como tamaño, color, etc.)
ShopSku	String	SKU específico de la tienda para el producto
ShippingType	String	Método de envío utilizado
Currency	String	Moneda utilizada para la transacción
VoucherCode	String	Código de cupón aplicado al artículo (solo si aplica)
Status	String	Estado actual del artículo del pedido
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
PromisedShippingTime	String	Fecha de compromiso de entrega al proveedor logístico
ExtraAttributes	String	Atributos adicionales relacionados con el artículo del pedido
ShippingProviderType	String	Indica el nivel de servicio según la velocidad de entrega. Los valores posibles son: Same day, Direct, Click & Collect, Next Day, Home Delivery y Regular.
CreatedAt	String	Marca de tiempo cuando se creó el artículo del pedido (formato ISO)
UpdatedAt	String	Marca de tiempo cuando se actualizó por última vez el artículo del pedido (formato ISO)
Vouchers	String	Lista de cupones aplicados al artículo
SalesType	String	Tipo de venta
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
Código de error	Mensaje
37	E037: One or more order id in the list are incorrect (Uno o varios identificadores de pedido de la lista son incorrectos)
38	E038: Too many orders were requested (Se solicitaron demasiados pedidos)
39	E039: No orders were found (No se han encontrado pedidos)
56	E056: Invalid OrdersIdList format. Must use array format [1,2] (Formato inválido de OrdersIdList. Debe utilizar el formato de matriz [1,2])
Metadata
Action
string
required
Defaults to GetMultipleOrderItems
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetMultipleOrderItems' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error "E008: Acción no válida".

GetMultipleOrderItems
Format
string
required
Defaults to XML
Si se suministra, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

XML
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
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.uting the SHA256 hash of the request, using the API key of the user specified in the UserID parameter. Mandatory. If omitted, an ‘E001: Parameter Signature is mandatory’ error message is returned. If the signature is incorrect, an ‘E007: Login failed. Signature mismatch’ error message is returned.

OrderIdList
array of int32s
required
Lista separada por comas de identificadores de órdenes entre corchetes.


ADD int32
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

linioDevelopersHub.getqcstatus({Action: 'GetMultipleOrderItems', Format: 'XML'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            GetMultipleOrderItems
        </RequestAction>
        <ResponseType>
            Orders
        </ResponseType>
        <Timestamp>
            2025-10-23T13:43:29.163Z
        </Timestamp>
    </Head>
    <Body>
        <Orders>
            <Order>
                <OrderId>
                    1127917111
                </OrderId>
                <OrderNumber>
                    3204390000
                </OrderNumber>
                <OrderItems>
                    <OrderItem>
                        <OrderItemId>
                            126930387
                        </OrderItemId>
                        <ShopId>
                            2ac93993-bf8d-4fef-ba01-fe4732df77a2
                        </ShopId>
                        <OrderId>
                            1127917497
                        </OrderId>
                        <Name>
                            Zapatillas
                        </Name>
                        <Sku>
                            test1
                        </Sku>
                        <Variation>
                            {"color":{"name":"Blanco","code":"#FFFFFF"},"size":"36.5"}
                        </Variation>
                        <ShopSku>
                            140604778
                        </ShopSku>
                        <ShippingType>
                            Dropshipping
                        </ShippingType>
                        <Currency>
                            CLP
                        </Currency>
                        <VoucherCode/>
                        <Status>
                            ready_to_ship
                        </Status>
                        <IsProcessable>
                            1
                        </IsProcessable>
                        <ShipmentProvider>
                            home delivery corp
                        </ShipmentProvider>
                        <IsDigital>
                            0
                        </IsDigital>
                        <DigitalDeliveryInfo/>
                        <TrackingCode>
                            140111000010799985
                        </TrackingCode>
                        <TrackingCodePre/>
                        <Reason/>
                        <ReasonDetail/>
                        <PurchaseOrderId/>
                        <PurchaseOrderNumber/>
                        <PackageId>
                            PKG0059711638
                        </PackageId>
                        <PromisedShippingTime>
                            2025-10-24 21:57:00
                        </PromisedShippingTime>
                        <ExtraAttributes>
                            {"itemId":"1","originNode":"6146e548-08bb-47e0-8f11-8d44a70e553b","originNodeType":"SELLER","deliveryOrderGroupId":"149216054447"}
                        </ExtraAttributes>
                        <ShippingProviderType>
                            regular
                        </ShippingProviderType>
                        <CreatedAt>
                            2025-10-23 10:25:03
                        </CreatedAt>
                        <UpdatedAt>
                            2025-10-23 10:42:11
                        </UpdatedAt>
                        <Vouchers/>
                        <SalesType>
                            TDR
                        </SalesType>
                        <ReturnStatus/>
                        <WalletCredits>
                            0.00
                        </WalletCredits>
                        <ItemPrice>
                            69990.00
                        </ItemPrice>
                        <PaidPrice>
                            69990.00
                        </PaidPrice>
                        <TaxAmount>
                            0.00
                        </TaxAmount>
                        <CodCollectableAmount>
                            0.00
                        </CodCollectableAmount>
                        <ShippingAmount>
                            0.00
                        </ShippingAmount>
                        <ShippingServiceCost>
                            0.00
                        </ShippingServiceCost>
                        <ShippingTax>
                            0.00
                        </ShippingTax>
                        <VoucherAmount>
                            0.00
                        </VoucherAmount>
                    </OrderItem>
                </OrderItems>
            </Order>
            <Order>
                <OrderId>
                    1127916333
                </OrderId>
                <OrderNumber>
                    3204390000
                </OrderNumber>
                <OrderItems>
                    <OrderItem>
                        <OrderItemId>
                            126927111
                        </OrderItemId>
                        <ShopId>
                            0f20d229-2810-4f39-a439-bad280cd0f14
                        </ShopId>
                        <OrderId>
                            1127916333
                        </OrderId>
                        <Name>
                            Zapatillas Hombre
                        </Name>
                        <Sku>
                            test1
                        </Sku>
                        <Variation>
                            {"color":{"name":"Negro","code":"#000000"},"size":"37"}
                        </Variation>
                        <ShopSku>
                            143080900
                        </ShopSku>
                        <ShippingType>
                            Dropshipping
                        </ShippingType>
                        <Currency>
                            CLP
                        </Currency>
                        <VoucherCode/>
                        <Status>
                            ready_to_ship
                        </Status>
                        <IsProcessable>
                            1
                        </IsProcessable>
                        <ShipmentProvider>
                            home delivery corp
                        </ShipmentProvider>
                        <IsDigital>
                            0
                        </IsDigital>
                        <DigitalDeliveryInfo/>
                        <TrackingCode>
                            140111000010799785
                        </TrackingCode>
                        <TrackingCodePre/>
                        <Reason/>
                        <ReasonDetail/>
                        <PurchaseOrderId/>
                        <PurchaseOrderNumber/>
                        <PackageId>
                            PKG0059710887
                        </PackageId>
                        <PromisedShippingTime>
                            2025-10-24 21:57:00
                        </PromisedShippingTime>
                        <ExtraAttributes>
                            {"itemId":"1","originNode":"6146e548-08bb-47e0-8f11-8d44a70e553b","originNodeType":"SELLER","deliveryOrderGroupId":"149216053014"}
                        </ExtraAttributes>
                        <ShippingProviderType>
                            regular
                        </ShippingProviderType>
                        <CreatedAt>
                            2025-10-23 10:04:50
                        </CreatedAt>
                        <UpdatedAt>
                            2025-10-23 10:10:49
                        </UpdatedAt>
                        <Vouchers/>
                        <SalesType>
                            TDR
                        </SalesType>
                        <ReturnStatus/>
                        <WalletCredits>
                            0.00
                        </WalletCredits>
                        <ItemPrice>
                            39990.00
                        </ItemPrice>
                        <PaidPrice>
                            39990.00
                        </PaidPrice>
                        <TaxAmount>
                            0.00
                        </TaxAmount>
                        <CodCollectableAmount>
                            0.00
                        </CodCollectableAmount>
                        <ShippingAmount>
                            0.00
                        </ShippingAmount>
                        <ShippingServiceCost>
                            0.00
                        </ShippingServiceCost>
                        <ShippingTax>
                            0.00
                        </ShippingTax>
                        <VoucherAmount>
                            0.00
                        </VoucherAmount>
                    </OrderItem>
                </OrderItems>
            </Order>
        </Orders>
    </Body>
</SuccessResponse>