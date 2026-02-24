Consultar Bodegas Logísticas
get
https://sellercenter-api.falabella.com/?Action=GetWarehouse

GetWarehouse. Consulta la información de tus bodegas logísticas en Falabella Seller Center

La API GetWarehouses permite a los sellers obtener todas las bodegas asociadas a su cuenta, con la posibilidad de aplicar distintos filtros para consultar la información relevante.

Los campos de respuesta proporcionados por esta API se encuentran detallados en la siguiente tabla:

Nombre

Descripción

Valor ejemplo

name

Nombre de la bodega, asignado por el vendedor

Bodega Principal

sellerWarehouseId

Identificador único de la bodega, asignado por el vendedor

"wh_1234"

nodeID

Identificador único del nodo logistico, asignado por Falabella

80a433f0-070d-412d-8k26-57f27h65167c

facilityId

Identificador único de la instalación, asignado por Falabella

GSC-SC6JK68D5JJCE9E

address

Un objeto con información de la dirección de la bodega:

addressLine1: Calle y detalles concatenados de la dirección
addressLine2: ID de la entrada municipal en la tabla de la base de datos (id_country_municipal en GSC).
-addressLine3: ID de la entrada de la región en la tabla de la base de datos (id_country_region en GSC).
-cityCode: ID de la entrada de la ciudad en la tabla de la base de datos (id_country_city en GSC).
-countryCode: Código ISO del país (CL, CO, PE).
-contactAddress2Code:
Código municipal, distinto del ID municipal. Es un código asignado por la autoridad correspondiente a cada municipalidad. addressLine2 contiene un ID asociado a la municipalidad, mientras que este campo contiene el código municipal.
-country: Nombre del país donde se encuentra la dirección.
-state: Nombre de la región. El ID de la región se proporciona en el campo addressLine3.
-city: Nombre de la ciudad.
-municipal: Nombre de la municipalidad (ES: comuna) donde se encuentra el almacén.
-postcode: Nombre de la ciudad donde se encuentra el almacén.
-email: Correo de contacto del almacén.
-name: Nombre de contacto del almacén.
-phone: Teléfono de contacto del almacén.
-latitude: Coordenada geográfica de latitud de la dirección.
-longitude: Coordenada geográfica de longitud de la dirección.
"address": {
"addressLine1": "Contact Address 1",
"addressLine2": "293",
"addressLine3": "753",
"municipal": "Providencia",
"city": "Santiago",
"state": "Metropolitana de Santiago",
"postcode": "7500000",
"countryCode": "CL",
"email": "maverick@cs.cz",
"name": "Luis Fernando",

"phone": "3128960168",

"latitude": "18.4781328",
"longitude": "-97.4294098",
"cityCode": null,
"country": "Chile",
"contactAddress2Code": "13123",
},

workingSchedule

Un arreglo de información de días y horarios de trabajo de la bodega del vendedor

*day**: Día de la semana (lunes, martes, miércoles, etc)
*shiftHours**: un objeto con
openingHour: horario de apertura de bodega
closingHour: horario de cierre de bodega
"workingSchedule": [
{
"day": "monday",
"shiftHours": {
"openingHour": "08:00 AM",
"closingHour": "04:00 PM"
}
},

{
"day": "tuesday",
"shiftHours": {
"openingHour": "08:00 AM",
"closingHour": "04:00 PM"
}
},
],

warehouseType

Detalles del tipo de bodega (envío o devolución), los posibles valores son: ("only_returns", "only_shipments")

only_shipments

zoneAvailable

Indicador para verificar si los datos de la zona están disponibles para el nodo logístico, los posibles valores son: ("true", "false")

false

zoneUpdatedAt

Información sobre los datos de la zona, la última fecha y hora en que los datos de la zona se sincronizaron con Falabella

null

isFbf

Indicador para verificar si la bodega está habilitada para Fulfillment by Falabella, los posibles valores son: ("true", "false")

true

isDefault

Indicador para señalar si la bodega es la predeterminada, los posibles valores son: ("true", "false")

false

isPickupStore

Indicador para verificar si la bodega está habilitada para retiro por cliente final, los posibles valores son: ("true", "false")

true

isEnabled

Indicador para verificar si la bodega está habilitada, los posibles valores son: ("true", "false")

true



Errores comunes y su mitigación
Código de error	Mensaje de error	Mitigación
1000	Invalid request parameter warehouseType: The allowed values must be one of only_returns, only_shipments. 'test' given	Verifica que el parámetro WarehouseType sea solo only_returns o only_shipments.
1000	Invalid request parameter isEnabled: test is not a valid boolean value	Usa valores booleanos válidos (true o false) para IsEnabled.
1000	Invalid request parameter isDefault: test is not a valid boolean value	Usa valores booleanos válidos (true o false) para IsDefault.
1000	Invalid request parameter sellerWarehouseId: '23.' does not match against pattern '/^[a-zA-Z0-9-_][a-zA-Z0-9-_]*$/'	Elimina símbolos no permitidos como puntos o caracteres especiales en SellerWarehouseId.
1000	Invalid request parameter sellerWarehouseId: '12345678901234567890123456789012345678901234567890123' is more than 50 characters long	Usa un valor con máximo 50 caracteres para SellerWarehouseId.
1000	Invalid request parameter facilityId: '23.' does not match against pattern '/^[a-zA-Z0-9-_][a-zA-Z0-9-_]*$/'	Elimina símbolos no permitidos como puntos o caracteres especiales en FacilityId.
1000	Invalid request parameter facilityId: '12345678901234567890123456789012345678901234567890123' is more than 50 characters long	Usa un valor con máximo 50 caracteres para FacilityId
19	Invalid parameter Limit: value "XXX" exceeds the maximum number of records allowed (100)	Usa un valor en límite de 100 o menos
19	E019: "X" Invalid Limit	Usa un valor en límite entre 1 y 100
14	E014: "X" Invalid Offset	Usa un valor en Offset que sea 0 o un número positivo
1000	An unexpected error occurred, please try again.	Reintenta la solicitud. Si el problema persiste, revisa la estructura del request.
Metadata
Action
string
required
Defaults to GetWarehouse
Nombre de la función que se va a llamar. Obligatorio y debe ser 'GetContentScore' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory' (El parámetro Action es obligatorio). Si se proporciona una cadena de función desconocida, se devuelve un mensaje de error 'E008: Invalid Action' (Acción no válida).

GetWarehouse
Format
string
enum
Defaults to XML
Si se proporciona, debe ser 'JSON' o 'XML'. Si no se proporciona, se asume 'XML'.


XML
Allowed:

XML

JSON
Timestamp
date
required
La hora actual en formato ISO8601 relativa a UTC (p. Ej., Marca de tiempo = 2015-04-01T10: 00: 00 + 02: 00 para Berlín), de modo que las llamadas no puedan ser reproducidas por un tercero que espíe (es decir, aquellas llamadas demasiado lejos en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se proporciona, aparece el mensaje de error 'E001: La marca de tiempo del parámetro es obligatoria'. Si la marca de tiempo es demasiado antigua o está en el futuro, se devuelve un mensaje de error "E003: Timestamp has expired" (Timestamp expiró).

UserId
string
required
El ID del usuario que realiza la llamada. La lista de usuarios autorizados se mantiene en la interfaz web del Centro de vendedores en Configuración general / Administrar usuarios.

Version
string
required
La versión de API contra la que se ejecutará esta llamada, en formato mayor-punto-menor. Actualmente debe ser 1.0, aunque la versión real de la API es 2.6.20. Si se omite, se devuelve un mensaje de error "E001: Parameter Version is mandatory" (El parámetro Version es obligatorio).

Signature
string
required
La firma criptográfica que autentica la solicitud. Una persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error "E001: Parameter Signature is mandatory" (El parámetro Signature es obligatorio). Si la firma es incorrecta, un 'E007: Login failed' (Error de inicio de sesión). Se devuelve el mensaje de error de discrepancia de firma.

FacilityId
string
ID único de bodega asignado por Falabella. (Opcional)

SellerWarehouseId
string
ID único de bodega asignado por Seller. (Opcional)

WarehouseType
string
enum
Filtro por tipo de bodega ["only_shipments", "only_returns"]


Allowed:

only_shipments

only_returns
IsEnabled
integer
enum
Filtro por estado de bodega [1, 0]


Allowed:

1

0
IsDefault
integer
enum
Filtro por bodega predeterminada ["true", "false"]


Allowed:

1

0
Limit
int32
Defaults to 20
Limite de bodegas por requerimiento (max 100)

20
Offset
int32
Defaults to 0
Número de registros a omitir desde la posición 0

0
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

linioDevelopersHub.getqcstatus({Action: 'GetWarehouse', Format: 'XML', Limit: '20', Offset: '0'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

Response:
# Ejemplo de Bodegas (Datos Dummy)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
     <Head>
          <RequestId/>
          <RequestAction>GetWarehouse</RequestAction>
          <ResponseType>Warehouses</ResponseType>
          <Timestamp>2025-12-03T14:22:09-0300</Timestamp>
     </Head>
     <Body>
          <Warehouses>
               <Warehouse>
                    <name>Bodega_demo_03</name>
                    <sellerWarehouseId/>
                    <facilityId>GSC-SC3E1084ABE1233</facilityId>
                    <warehouseType>only_returns</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>true</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>true</isEnabled>
                    <address>
                         <addressLine1>Av. Principal 456, Ciudad Demo</addressLine1>
                         <addressLine2>4818</addressLine2>
                         <addressLine3>4518</addressLine3>
                         <municipal>Medellín</municipal>
                         <city>Antioquia</city>
                         <state>Región Eje Cafetero - Antioquia</state>
                         <postcode>05001</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo2@example.com</email>
                         <name>Bodega_demo_02</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3200000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>5.000000</latitude>
                         <longitude>-75.500000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>05001</contactAddress2Code>
                         <phone>3000000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000001</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>07:30 AM</openingHour>
                                        <closingHour>02:30 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>07:30 AM</openingHour>
                                        <closingHour>02:30 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>07:30 AM</openingHour>
                                        <closingHour>02:30 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>07:30 AM</openingHour>
                                        <closingHour>02:30 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>07:30 AM</openingHour>
                                        <closingHour>02:30 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_01</name>
                    <sellerWarehouseId>5288</sellerWarehouseId>
                    <facilityId>SD-SC3E10834032F51</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>false</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>false</isEnabled>
                    <address>
                         <addressLine1>Av. Principal 456, Ciudad Demo</addressLine1>
                         <addressLine2>4259</addressLine2>
                         <addressLine3/>
                         <municipal>Bogotá D.C.</municipal>
                         <city>Bogotá D.C.</city>
                         <state>Región Centro Oriente</state>
                         <postcode>11001</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo3@example.com</email>
                         <name>Bodega_demo_03</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3100000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>6.200000</latitude>
                         <longitude>-73.900000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>11001</contactAddress2Code>
                         <phone>3000000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000002</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_03</name>
                    <sellerWarehouseId>5321</sellerWarehouseId>
                    <facilityId>SD-SC3E108A26A3994</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>false</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>false</isEnabled>
                    <address>
                         <addressLine1>Cra. 78 #45-90, Ciudad Demo</addressLine1>
                         <addressLine2/>
                         <addressLine3/>
                         <municipal>Bogotá D.C.</municipal>
                         <city>Bogotá D.C.</city>
                         <state>Región Centro Oriente</state>
                         <postcode/>
                         <countryCode>CO</countryCode>
                         <email>demo1@example.com</email>
                         <name>Bodega_demo_03</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3100000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>4.600000</latitude>
                         <longitude>-73.900000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>11001</contactAddress2Code>
                         <phone>3100000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000001</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_03</name>
                    <sellerWarehouseId>5035</sellerWarehouseId>
                    <facilityId>SD-SC3E108B3791F35</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>false</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>false</isEnabled>
                    <address>
                         <addressLine1>Calle Falsa 123, Ciudad Demo</addressLine1>
                         <addressLine2>4818</addressLine2>
                         <addressLine3/>
                         <municipal>Medellín</municipal>
                         <city>Antioquia</city>
                         <state>Región Eje Cafetero - Antioquia</state>
                         <postcode>05001</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo2@example.com</email>
                         <name>Bodega_demo_02</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3100000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>4.600000</latitude>
                         <longitude>-74.100000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>05001</contactAddress2Code>
                         <phone>3000000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000002</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_02</name>
                    <sellerWarehouseId>5238</sellerWarehouseId>
                    <facilityId>SD-SC3E108C9103F5B</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>false</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>false</isEnabled>
                    <address>
                         <addressLine1>Av. Principal 456, Ciudad Demo</addressLine1>
                         <addressLine2>4818</addressLine2>
                         <addressLine3/>
                         <municipal>Medellín</municipal>
                         <city>Antioquia</city>
                         <state>Región Eje Cafetero - Antioquia</state>
                         <postcode>05001</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo2@example.com</email>
                         <name>Bodega_demo_03</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3100000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>6.200000</latitude>
                         <longitude>-75.500000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>05001</contactAddress2Code>
                         <phone>3000000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000002</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_01</name>
                    <sellerWarehouseId>5104</sellerWarehouseId>
                    <facilityId>SD-SC3E108F490189B</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>false</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>false</isEnabled>
                    <address>
                         <addressLine1>Av. Principal 456, Ciudad Demo</addressLine1>
                         <addressLine2>4259</addressLine2>
                         <addressLine3/>
                         <municipal>Bogotá D.C.</municipal>
                         <city>Bogotá D.C.</city>
                         <state>Región Centro Oriente</state>
                         <postcode>11001</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo1@example.com</email>
                         <name>Bodega_demo_02</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3200000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>5.000000</latitude>
                         <longitude>-75.500000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>11001</contactAddress2Code>
                         <phone>3000000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000001</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>05:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
               <Warehouse>
                    <name>Bodega_demo_01</name>
                    <sellerWarehouseId/>
                    <facilityId>GSC-SC3E1087761A7FA</facilityId>
                    <warehouseType>only_shipments</warehouseType>
                    <isFbf>false</isFbf>
                    <isDefault>true</isDefault>
                    <isPickupStore>false</isPickupStore>
                    <isEnabled>true</isEnabled>
                    <address>
                         <addressLine1>Calle Falsa 123, Ciudad Demo</addressLine1>
                         <addressLine2>4799</addressLine2>
                         <addressLine3>4518</addressLine3>
                         <municipal>Girardota</municipal>
                         <city>Antioquia</city>
                         <state>Región Eje Cafetero - Antioquia</state>
                         <postcode>05308</postcode>
                         <countryCode>CO</countryCode>
                         <email>demo2@example.com</email>
                         <name>Bodega_demo_03</name>
                         <contacts>
                              <contacts>
                                   <type>Phone</type>
                                   <value>3100000000</value>
                                   <typeDescription>Default warehouse phone number</typeDescription>
                              </contacts>
                         </contacts>
                         <latitude>6.200000</latitude>
                         <longitude>-74.100000</longitude>
                         <cityCode/>
                         <stateCode/>
                         <country>Colombia</country>
                         <contactAddress2Code>05308</contactAddress2Code>
                         <phone>3200000000</phone>
                    </address>
                    <nodeId>00000000-0000-0000-0000-000000000001</nodeId>
                    <zoneAvailable>false</zoneAvailable>
                    <zoneUpdatedAt/>
                    <workingSchedule>
                         <workingSchedule>
                              <day>monday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>tuesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>wednesday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>thursday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                         <workingSchedule>
                              <day>friday</day>
                              <shiftHours>
                                   <shiftHours>
                                        <openingHour>02:00 PM</openingHour>
                                        <closingHour>04:00 PM</closingHour>
                                   </shiftHours>
                              </shiftHours>
                         </workingSchedule>
                    </workingSchedule>
               </Warehouse>
          </Warehouses>
          <Message/>
     </Body>
</SuccessResponse>
```