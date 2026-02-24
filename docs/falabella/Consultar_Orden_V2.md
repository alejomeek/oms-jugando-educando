Consultar Orden V2
get
https://sellercenter-api.falabella.com/GetOrder

GetOrder. A través de un OrderId, obtiene los elementos para un solo pedido. (versión 2.0). Esta versión del API incluye la bodega de origen de la venta

Recuerda que puedes ver los estados disponibles de las órdenes en el apartado flujos de órdenes (Aquí)

Los campos de respuesta proporcionados por esta API se encuentran detallados en la siguiente tabla:


Nombre del campo

Tipo

Descripción

OrderId

Unsigned

Identificador de este pedido asignado por el Falabella Seller Center

CustomerFirstName

String

El nombre del cliente

CustomerLastName

String

El apellido del cliente

OrderNumber

Unsigned

El número de pedido

PaymentMethod

String

La forma de pago

DeliveryInfo

String

Información sobre la entrega de ese pedido

Price

Float

El importe total de este pedido

GiftOption

Boolean

1 si el artículo es un regalo, 0 si no lo es

GiftMessage

String

Mensaje de regalo según lo especificado por el cliente

CreatedAt

DateTime

Fecha y hora en que se realizó el pedido

UpdatedAt

DateTime

Fecha y hora de la última modificación de la orden

AddressBilling

Subsection

Nodo que contiene nodos adicionales, que conforman la dirección de facturación: Nombre, Apellido, Teléfono, Teléfono2, Dirección1, Dirección2, Ciudad, Código postal, País

AddressShipping

Subsection

Nodo que contiene nodos adicionales, que conforman la dirección de envío: Nombre, Apellido, Teléfono, Teléfono2, Dirección1, Dirección2, Ciudad, Código postal, País

NationalRegistrationNumber

String

Se requiere en algunos países

ItemsCount

Integer

Número de artículos en orden

Statuses

Array

Estados únicos de los artículos del pedido. (pista: puede encontrar todos los diferentes códigos de estado en el ejemplo de respuesta)

PromisedShippingTime

DateTime

Corresponde a la fecha en que la orden debe ser entregada al operador logístico. Esfundamental cumplir con este plazo para evitar adelantos o retrasos en el envío, ya que cualquier desviación podría generar penalizaciones.

ExtraAttributes

String

Atributos extra que fueron pasados a Falabella Seller Center en la llamada getMarketPlaceOrders.

Es una cadena JSON que el cliente debe analizar.

ExtraBillingAttributes

String

Nodo que contiene información adicional para facturación: LegalId FiscalPerson, DocumentType, ReceiverRegion, ReceiverAddress, ReceiverPostcode, ReceiverLegalName, ReceiverMunicipality, ReceiverTypeRegimen, CustomerVerifierDigit

ShippingType

String

Modalidad de fulfillment y de delivery de la orden. ¹

InvoiceRequired

Boolean

Entrega valor True(“Factura empresa” en Colombia) si el documento es factura, y valor False si este es una boleta (“Factura persona natural” en Colombia).

SellerWarehouseId

String

ID único de bodega asignado por el Seller.

FacilityId

String

ID único de bodega asignado por Falabella.


¹ - Este campo se puede utilizar para diferenciar la modalidad de fulfillment y agregar reglas de decisión para el consumo o no consumo de stocks en los sistemas de gestión de inventarios de integradores, como se muestra en los siguientes ejemplos:

Cuando el ShipmenType es Dropshipping las ordenes son fulfillment by the seller por lo que deben consumir stock ya que se arman en bodegas propias;
Cuando el ShipmenType es Own Warehouse, estas ordenes son fulfillment by Falabella y no deberían con sumir stock por que este ya fue entregado a Falabella.com para que realice el fulfillment en nombre del seller.
📘
¿Boleta o Factura?
Como se muestra en la tabla anterior, el campo 'InvoiceRequired' indica si la venta se realizó mediante boleta ('Factura persona natural' en Colombia) o factura ('Factura empresa' en Colombia). Devolverá 'True' si es factura y 'False' si es boleta.

Si es factura ('Factura empresa' en Colombia), el API devolverá una serie de campos con información relevante para generar la facturación, presentados en la siguiente tabla

Campo

Aclaración

Descripción

ReceiverLegalName

Razón social

Corresponde al negocio al que se le debe emitir la factura empresa.

ReceiverAddress

Dirección

Dirección a la que se debe hacer la factura.

ReceiverRegion

Región (Chile) / Departamento (Perú) / Departamento (Colombia)

Locación en que se encuentra la dirección

ReceiverMunicipality

Comuna (Chile) / Provincia (Perú) / Ciudad o Municipio (Colombia)

corresponde a la zona en la que se encuentra la
dirección.

FiscalPerson

Personal fiscal

Identificación del negocio

DocumentType

Tipo documento

Tipo de documento de identificación del rol
tributario de la razón social.

LegalId

Identificación legal

Corresponde al número del documento identificado en el campo "Tipo de documento" con digito verificador

ReceiverTypeRegimen

Actividad económica

Código y nombre de la actividad o industria en la que se desempeña la razón social.

CustomerVerifierDigit

Digito verificador

Es el digito verificador del "identificador legal".

ReceiverEmail

Correo

Correo que debe asociar a la Factura

ReceiverPhonenumber

Teléfono

Teléfono que debe asociar a la Factura

Errores
Código de error	Mensaje
16	E016: "%s" Invalid Order ID (ID de pedido inválido)
Metadata
Action
string
required
Defaults to GetOrder
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetOrder' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Acción no válida'.

GetOrder
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

UserId
string
required
El ID del usuario que realiza la llamada. La lista de usuarios autorizados se mantiene en la interfaz web de Seller Center en Configuración/Gestión de usuarios.

Version
string
required
Defaults to 2.0
La versión de la API contra la que se va a ejecutar esta llamada, para esta versión debe considerarse 2.0

2.0
Signature
string
required
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.

OrderId
int32
required
El identificador de la orden que fue asignado en SellerCenter.

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

linioDevelopersHub.getorderv2({Action: 'GetOrder', Format: 'XML', Version: '2.0'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            GetOrder
        </RequestAction>
        <ResponseType>
            Order
        </ResponseType>
        <Timestamp>
            2025-04-03T19:51:00.348Z
        </Timestamp>
    </Head>
    <Body>
        <Orders>
            <Order>
                <OrderId>
                    1104901123
                </OrderId>
                <CustomerFirstName>
                    Fala
                </CustomerFirstName>
                <CustomerLastName>
                    Test
                </CustomerLastName>
                <OrderNumber>
                    2777001234
                </OrderNumber>
                <PaymentMethod>
                    ecommPay
                </PaymentMethod>
                <Price>
                    19990
                </Price>
                <GiftOption>
                    0
                </GiftOption>
                <GiftMessage/>
                <VoucherCode/>
                <CreatedAt>
                    2025-04-01 12:00:00
                </CreatedAt>
                <UpdatedAt>
                    2025-04-01 15:00:00
                </UpdatedAt>
                <AddressUpdatedAt>
                    2025-04-01 12:00:00
                </AddressUpdatedAt>
                <Remarks/>
                <DeliveryInfo/>
                <ItemsCount>
                    1
                </ItemsCount>
                <AddressBilling>
                    <FirstName>
                        Fala
                    </FirstName>
                    <LastName>
                        Test
                    </LastName>
                    <Address1>
                        Avenida Siempre Viva
                    </Address1>
                    <Address2>
                        742
                    </Address2>
                    <Address3>
                        Depto 101
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        fala.test@correo.cl
                    </CustomerEmail>
                    <City>
                        Santiago
                    </City>
                    <Ward>
                        Providencia
                    </Ward>
                    <Region>
                        Metropolitana
                    </Region>
                    <PostCode>
                        7500000
                    </PostCode>
                    <Country>
                        CL
                    </Country>
                    <Phone/>
                    <Phone2/>
                </AddressBilling>
                <AddressShipping>
                    <FirstName>
                        Fala
                    </FirstName>
                    <LastName>
                        Test
                    </LastName>
                    <Address1>
                        Avenida Siempre Viva
                    </Address1>
                    <Address2>
                        742
                    </Address2>
                    <Address3>
                        Depto 101
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        fala.test@correo.cl
                    </CustomerEmail>
                    <City>
                        Santiago
                    </City>
                    <Ward>
                        Providencia
                    </Ward>
                    <Region>
                        Metropolitana
                    </Region>
                    <Country>
                        CL
                    </Country>
                    <PostCode></PostCode>
                    <Phone/>
                    <Phone2/>
                </AddressShipping>
                <NationalRegistrationNumber>
                    12345678-9
                </NationalRegistrationNumber>
                <PromisedShippingTime>
                    2025-04-04 23:00:00
                </PromisedShippingTime>
                <ExtraAttributes>
                    {"itemId":"1","deliveryOrderGroupId":"149186887567","originNode":"e3b0ebac-cae8-4849-8ba7-d063434ccca0"}
                </ExtraAttributes>
                <ExtraBillingAttributes>
                    <LegalId/>
                    <FiscalPerson/>
                    <DocumentType/>
                    <ReceiverRegion/>
                    <ReceiverAddress/>
                    <ReceiverPostcode/>
                    <ReceiverLegalName/>
                    <ReceiverMunicipality/>
                    <ReceiverTypeRegimen/>
                    <CustomerVerifierDigit/>
                    <ReceiverPhonenumber/>
                    <ReceiverEmail/>
                    <ReceiverLocality/>
                </ExtraBillingAttributes>
                <InvoiceRequired>
                    false
                </InvoiceRequired>
                <OperatorCode>
                    facl
                </OperatorCode>
                <ShippingType>
                    Dropshipping
                </ShippingType>
                <GrandTotal>
                    19990
                </GrandTotal>
                <ProductTotal>
                    19990
                </ProductTotal>
                <TaxAmount>
                    0
                </TaxAmount>
                <ShippingFeeTotal>
                    0
                </ShippingFeeTotal>
                <ShippingTax>
                    0
                </ShippingTax>
                <Voucher>
                    0
                </Voucher>
                <Statuses>
                    <Status>
                        ready_to_ship
                    </Status>
                </Statuses>
                <Warehouse>
                    <SellerWarehouseId>
                        WH123
                    </SellerWarehouseId>
                    <FacilityId>
                        GSC-SC11212
                    </FacilityId>
                </Warehouse>
            </Order>
        </Orders>
    </Body>
</SuccessResponse>