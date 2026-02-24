Consultar Órdenes V2
get
https://sellercenter-api.falabella.com/?Action=GetOrders (COPY)


GetOrders. Obtiene un conjunto de órdenes (versión 2.0). Esta versión del API incluye la bodega de origen de la venta


Pueden generarse por ejemplo filtros por fechas, cantidad de ordenes (por defecto es 100) y estados. Recuerda que puedes ver los estados disponibles de las órdenes en el apartado flujos de órdenes (Aquí)

Los campos de respuesta proporcionados por esta API se encuentran detallados en la siguiente tabla:

Nombre del campo

Tipo

Descripción

TotalCount

Unsigned

Este número, que se muestra en la sección Cabeza, indica el número completo de todos los pedidos para el conjunto de filtros actual en la base de datos

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

Remarks

String

Una observación

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


Cuando el ShipmenType es Dropshipping las ordenes son fulfillment by the seller por lo que deben consumir stock ya que se arman en bodegas propias;

Cuando el ShipmenType es Own Warehouse, estas órdenes son fulfillment by Falabella y no deberían con sumir stock por que este ya fue entregado a Falabella.com para que realice el fulfillment en nombre del seller.


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
14	E014: "%s" Invalid Offset (Compensación inválida)
17	E017: "%s" Invalid Date Format (Formato de fecha no válido)
19	E019: "%s" Invalid Limit (Límite inválido)
36	E036: Invalid status filter (Filtro de estado inválido)
74	E074: Invalid sort direction. (Dirección de ordenación no válida)
75	E075: Invalid sort filter. (Filtro de ordenación no válido)
Metadata
Action
string
required
Defaults to GetOrders
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetOrders' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Acción no válida'.

GetOrders
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
El ID del usuario que realiza la llamada. La lista de usuarios autorizados se mantiene en la interfaz web de SellerCenter en Configuración/Gestión de usuarios.

Version
string
required
Defaults to 2.0
La versión de la API contra la que se va a ejecutar esta llamada, para efectos de esta versión, siempre debe aplicar 2.0

2.0
Signature
string
required
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.

CreatedAfter
date
Limita la lista de pedidos devuelta a los creados después o en una fecha especificada, dada en formato de fecha ISO 8601. O bien CreatedAfter o bien UpdatedAfter son obligatorios o bien se devolverá un error 'E018: Either CreatedAfter or UpdatedAfter is mandatory' será devuelto.

CreatedBefore
date
Limita la lista de pedidos devuelta a los creados antes o en una fecha especificada, dada en formato de fecha ISO 8601. Opcional.

UpdatedAfter
date
Limita la lista de pedidos devuelta a los actualizados después o en una fecha especificada, dada en formato de fecha ISO 8601. O bien UpdatedAfter o bien CreatedAfter son obligatorios o bien se devolverá un error 'E018: O bien CreatedAfter o bien UpdatedAfter es obligatorio' será devuelto. Nota: El updateAfter no está relacionado con el updateAt del pedido, sino con el createAt del historial del pedido de venta. En la versión 2.0 se utiliza la dirección de la orden actualizada en, y no el historial del artículo de la orden.

UpdatedBefore
date
Limita la lista de pedidos devuelta a los actualizados antes o en una fecha especificada, dada en formato de fecha ISO 8601. Opcional. Nota: El updateBeore no está relacionado con el updateAt del pedido, sino con el createAt del historial del artículo de venta. En la versión 2.0 se utiliza la dirección de la orden actualizada en, y no el historial del artículo de la orden.

Limit
int32
Defaults to 1000
El número máximo de pedidos que deben ser devueltos, por defecto 1000

1000
Offset
int32
Número de órdenes que se saltan al principio de la lista (es decir, un desplazamiento en el conjunto de resultados; junto con el parámetro Límite, es posible la paginación simple del conjunto de resultados; si se paginan los resultados, tenga en cuenta que la lista de órdenes puede cambiar durante la paginación).

Status
string
Cuando se establece, limita el conjunto de pedidos devueltos a los pedidos sueltos, que devuelven sólo las entradas que se ajustan al estado proporcionado. Los valores posibles son pending, canceled, ready_to_ship, delivered, returned, shipped y failed.

SortBy
string
Permite elegir la columna de ordenación. Valores posibles (created_at, updated_at). En la versión 2.0 está fijado en updated_at y no se puede cambiar

SortDirection
string
Especifica el tipo de ordenación. Valores posibles (ASC, DESC)

ShippingType
string
enum
Especifica el modelo de fulfillment de la orden. Para ordenes Fulfillment by Seller o armadas por el proveedor el valor es dropshipping; y para ordenes Fulfillment by Falabella o armadas por Falabella en nombre del seller el valor es own_warehouse


Allowed:

dropshipping

own_warehouse

cross_docking
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

linioDevelopersHub.getqcstatus({Action: 'GetOrders (COPY)', Format: 'XML', Version: '2.0', Limit: '1000'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
application/xml
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            GetOrders
        </RequestAction>
        <ResponseType>
            Orders
        </ResponseType>
        <Timestamp>
            2025-04-03T21:39:12.979Z
        </Timestamp>
        <TotalCount>
            2
        </TotalCount>
    </Head>
    <Body>
        <Orders>
            <Order>
                <OrderId>
                    1104089001
                </OrderId>
                <CustomerFirstName>
                    TestNombre
                </CustomerFirstName>
                <CustomerLastName>
                    TestApellido
                </CustomerLastName>
                <OrderNumber>
                    2771009001
                </OrderNumber>
                <PaymentMethod>
                    ecommPay
                </PaymentMethod>
                <Remarks/>
                <DeliveryInfo/>
                <Price>
                    24990
                </Price>
                <GiftOption>
                    0
                </GiftOption>
                <GiftMessage/>
                <VoucherCode/>
                <CreatedAt>
                    2025-04-03 12:00:00
                </CreatedAt>
                <UpdatedAt>
                    2025-04-03 14:00:00
                </UpdatedAt>
                <AddressUpdatedAt>
                    2025-04-03 12:00:00
                </AddressUpdatedAt>
                <AddressBilling>
                    <FirstName>
                        TestNombre
                    </FirstName>
                    <LastName>
                        TestApellido
                    </LastName>
                    <Address1>
                        Av. Providencia
                    </Address1>
                    <Address2>
                        1234
                    </Address2>
                    <Address3>
                        Depto 101
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        testcliente1@falabella.cl
                    </CustomerEmail>
                    <City>
                        SANTIAGO
                    </City>
                    <Ward>
                        PROVIDENCIA
                    </Ward>
                    <Region>
                        METROPOLITANA DE SANTIAGO
                    </Region>
                    <PostCode></PostCode>
                    <Country>
                        CL
                    </Country>
                    <Phone/>
                    <Phone2/>
                </AddressBilling>
                <AddressShipping>
                    <FirstName>
                        TestNombre
                    </FirstName>
                    <LastName>
                        TestApellido
                    </LastName>
                    <Phone/>
                    <Phone2/>
                    <Address1>
                        Av. Providencia
                    </Address1>
                    <Address2>
                        1234
                    </Address2>
                    <Address3>
                        Depto 101
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        testcliente1@falabella.cl
                    </CustomerEmail>
                    <City>
                        SANTIAGO
                    </City>
                    <Ward>
                        PROVIDENCIA
                    </Ward>
                    <Region>
                        REGION METROPOLITANA
                    </Region>
                    <Country>
                        CL
                    </Country>
                    <PostCode>
                        7500000
                    </PostCode>
                </AddressShipping>
                <NationalRegistrationNumber>
                    11111111
                </NationalRegistrationNumber>
                <ItemsCount>
                    1
                </ItemsCount>
                <PromisedShippingTime>
                    2025-04-04 23:00:00
                </PromisedShippingTime>
                <ExtraAttributes>
                    {"itemId":"1","deliveryOrderGroupId":"000000001","originNode":"node-test-001"}
                </ExtraAttributes>
                <ExtraBillingAttributes>
                    <LegalId/>
                    <FiscalPerson/>
                    <DocumentType/>
                    <ReceiverRegion/>
                    <ReceiverAddress/>
                    <ReceiverPostcode>
                        -
                    </ReceiverPostcode>
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
                    24990
                </GrandTotal>
                <ProductTotal>
                    24990
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
                        default-test-01
                    </SellerWarehouseId>
                    <FacilityId>
                        GSC-SC11212
                    </FacilityId>
                </Warehouse>
            </Order>
            <Order>
                <OrderId>
                    1104089002
                </OrderId>
                <CustomerFirstName>
                    TestUsuario
                </CustomerFirstName>
                <CustomerLastName>
                    DemoCliente
                </CustomerLastName>
                <OrderNumber>
                    2771009002
                </OrderNumber>
                <PaymentMethod>
                    ecommPay
                </PaymentMethod>
                <Remarks/>
                <DeliveryInfo/>
                <Price>
                    14990
                </Price>
                <GiftOption>
                    0
                </GiftOption>
                <GiftMessage/>
                <VoucherCode/>
                <CreatedAt>
                    2025-04-03 12:05:00
                </CreatedAt>
                <UpdatedAt>
                    2025-04-03 14:05:00
                </UpdatedAt>
                <AddressUpdatedAt>
                    2025-04-03 12:05:00
                </AddressUpdatedAt>
                <AddressBilling>
                    <FirstName>
                        TestUsuario
                    </FirstName>
                    <LastName>
                        DemoCliente
                    </LastName>
                    <Address1>
                        Av. Las Condes
                    </Address1>
                    <Address2>
                        4321
                    </Address2>
                    <Address3>
                        Casa 12
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        testcliente2@falabella.cl
                    </CustomerEmail>
                    <City>
                        SANTIAGO
                    </City>
                    <Ward>
                        LAS CONDES
                    </Ward>
                    <Region>
                        METROPOLITANA DE SANTIAGO
                    </Region>
                    <PostCode></PostCode>
                    <Country>
                        CL
                    </Country>
                    <Phone/>
                    <Phone2/>
                </AddressBilling>
                <AddressShipping>
                    <FirstName>
                        TestUsuario DemoCliente
                    </FirstName>
                    <LastName>
                        DemoCliente
                    </LastName>
                    <Phone/>
                    <Phone2/>
                    <Address1>
                        Av. Las Condes
                    </Address1>
                    <Address2>
                        4321
                    </Address2>
                    <Address3>
                        Casa 12
                    </Address3>
                    <Address4/>
                    <Address5/>
                    <CustomerEmail>
                        testcliente2@falabella.cl
                    </CustomerEmail>
                    <City>
                        SANTIAGO
                    </City>
                    <Ward>
                        LAS CONDES
                    </Ward>
                    <Region>
                        REGION METROPOLITANA
                    </Region>
                    <Country>
                        CL
                    </Country>
                    <PostCode></PostCode>
                </AddressShipping>
                <NationalRegistrationNumber>
                    22222222
                </NationalRegistrationNumber>
                <ItemsCount>
                    2
                </ItemsCount>
                <PromisedShippingTime>
                    2025-04-04 23:00:00
                </PromisedShippingTime>
                <ExtraAttributes>
                    {"itemId":"2","deliveryOrderGroupId":"000000002","originNode":"node-test-002"}
                </ExtraAttributes>
                <ExtraBillingAttributes>
                    <LegalId/>
                    <FiscalPerson/>
                    <DocumentType/>
                    <ReceiverRegion/>
                    <ReceiverAddress/>
                    <ReceiverPostcode>
                        -
                    </ReceiverPostcode>
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
                    14990
                </GrandTotal>
                <ProductTotal>
                    14990
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
                        default-test-01
                    </SellerWarehouseId>
                    <FacilityId>
                        GSC-SC11212
                    </FacilityId>
                </Warehouse>
            </Order>
        </Orders>
    </Body>
</SuccessResponse>