Obtener Etiqueta
get
https://sellercenter-api.falabella.com/?Action=GetDocument

GetDocument. Recupera las etiquetas de envío para un pedido

Los campos de respuesta proporcionados por esta API se encuentran detallados en la siguiente tabla:

Nombre del campo	Tipo	Descripción
DocumentType	String	Tipo de documento solicitado en la llamada a la API
MimeType*	String	Puede tener los valores text/plain o application/pdf, text/plain, indica el tipo de decodificación a utilizar para pasar de base64 a texto plano (.txt o.zpl), application/pdf, la decodificación para utilizar para pasar de base64 a pdf. Actualmente text/plain solo aplica para Chile
File	String	Etiqueta codificada en BASE64
*El Mimetype respondido en la llamada se basa en el tipo de formato solicitado previamente por el seller. El cambio de formato se solicita creando un ticket en la plataforma de Seller Support, por el momento esta solicitud solo puede ser realizado para seller de Chile.

Para reconstruir el archivo, los datos del nodo <File> deben ser decodificados en base64, e interpretarse según el <MimeType>.

🚧
## ¿Cómo solicitar tu en etiqueta ZPL?
Debes crear un ticket a través del boton soporte en Falabella Seller Center, seleccionando

Post Venta > Despacho de órdenes pendientes > Deseo recibir mis etiquetas en formato ZPL

Actualmente, solo aplica para Chile

Errores
Código de error	Mensaje
20	E020: "%s" Invalid Order Item IDs (ID de artículo de pedido no válidos)
21	E021: OMS Api Error Occurred (Se ha producido un error en la API)
32	E032: Document type "%s" is not valid (El tipo de documento "%s" no es válido)
34	E034: Order Item must be packed. Please call setStatusToReadyToShip before (El artículo del pedido debe estar embalado. Por favor, llame a setStatusToReadyToShip)
35	E035: "%s" was not found ( "%s" no fue encontrado)
Metadata
Action
string
required
Defaults to GetDocument
Nombre de la función que se va a llamar. Obligatorio y debe ser 'GetProducts' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory' (El parámetro Action es obligatorio). Si se proporciona una cadena de función desconocida, se devuelve un mensaje de error 'E008: Invalid Action' (Acción no válida).

GetDocument
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

DocumentType
string
required
Defaults to shippingParcel
Este campo debe ir con el valor shippingParcel. Obligatorio. Si se omite, o si se suministra un tipo de documento no admitido, se produce un error "E032: El tipo de documento "[tipo suministrado]" no es válido".

shippingParcel
OrderItemIds
array of int32s
required
Identificador de la posición de la orden para la que el llamante desea obtener un documento. Obligatorio. GetOrderItems


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

REQUEST:
npx api install "@linio-developers-hub/v500#1a37g1lx5md3h95yf"

import linioDevelopersHub from '@api/linio-developers-hub';

linioDevelopersHub.getqcstatus({Action: 'GetDocument', Format: 'XML', DocumentType: 'shippingParcel'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));


RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId></RequestId>
        <RequestAction>
            GetDocument
        </RequestAction>
        <ResponseType></ResponseType>
        <Timestamp>
            2013-08-27T14:44:13+0000
        </Timestamp>
    </Head>
    <Body>
        <Document>
            <DocumentType>
                parcel
            </DocumentType>
            <MimeType>
                text/html
            </MimeType>
            <File>
                YTM0NZomIzI2OTsmIzM0NTueYQ==
            </File>
        </Document>
    </Body>
</SuccessResponse>