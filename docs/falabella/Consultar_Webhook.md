Consultar Webhook
get
https://sellercenter-api.falabella.com/?Action=GetWebhooks

GetWebhooks Entrega todos o un subconjunto de webhook configurados en el comercio

Las etiquetas XML tienen el siguiente significado:

Nombre del campo	Tipo	Descripción
WebhookId	String	Identificador de un Webhook asignado por Falabella Seller Center
CallbackUrl	String	La url del webhook que será llamado por Falabella Seller Center
WebhookSource	String	La fuente de creación del webhook
Events	Event[]	Lista de eventos relacionados con el webhook identificados por su alias, ver la llamada GetWebhookEntities para más detalles
Metadata
Action
string
Defaults to GetWebhooks
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetWebhooks' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Invalid Action'.

GetWebhooks
Timestamp
date
La hora actual en formato ISO8601 relativa a UTC (p. Ej., Marca de tiempo = 2015-04-01T10: 00: 00 + 02: 00 para Berlín), de modo que las llamadas no puedan ser reproducidas por un tercero que espíe (es decir, aquellas llamadas demasiado lejos en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se proporciona, aparece el mensaje de error 'E001: La marca de tiempo del parámetro es obligatoria'. Si la marca de tiempo es demasiado antigua o está en el futuro, se devuelve un mensaje de error "E003: Timestamp has expired" (Timestamp expiró).

UserID
string
El ID del usuario que realiza la llamada. La lista de usuarios autorizados se mantiene en la interfaz web de Seller Center en Configuración/Gestión de usuarios.

Version
string
La versión de la API contra la que se va a ejecutar esta llamada, en formato mayor-punto-menor. Debe ser actualmente 1.0, aunque la versión real de la API sea 2.6.20. Si se omite, se devuelve un mensaje de error 'E001: Parameter Version is mandatory'.

Signature
string
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.

Format
string
Defaults to XML
Formato de salida. Si se proporciona, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

XML
WebhookIds
array of strings
Lista de Webhooks a recuperar. Lista separada por comas entre corchetes. Opcional. Si se omite, se devuelven todos los Webhooks disponibles.


ADD string
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

linioDevelopersHub.getqcstatus({Action: 'GetWebhooks', Format: 'XML'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            GetWebhooks
        </RequestAction>
        <ResponseType>
            Webhooks
        </ResponseType>
        <Timestamp>
            2016-06-07T18:35:09+0200
        </Timestamp>
    </Head>
    <Body>
        <Webhooks>
            <Webhook>
                <WebhookId>
                    7dffaa4e-1713-42c2-84ba-1d2fbd4537ab
                </WebhookId>
                <CallbackUrl>
                    http://localhost/callbacks/1
                </CallbackUrl>
                <WebhookSource>
                    web
                </WebhookSource>
                <Events>
                    <Event>
                        onProductCreated
                    </Event>
                </Events>
            </Webhook>
            <Webhook>
                <WebhookId>
                    fbfe60be-b282-4bc1-9e4d-2147c686d1a8
                </WebhookId>
                <CallbackUrl>
                    http://localhost/callbacks/2k
                </CallbackUrl>
                <WebhookSource>
                    api
                </WebhookSource>
                <Events>
                    <Event>
                        onOrderCreated
                    </Event>
                </Events>
            </Webhook>
        </Webhooks>
    </Body>
</SuccessResponse>