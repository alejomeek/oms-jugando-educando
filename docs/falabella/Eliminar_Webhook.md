Eliminar Webhook
post
https://sellercenter-api.falabella.com/?Action=DeleteWebhook

DeleteWebhook. Para un webhookId, elimina un webhook asociado al comercio

Si se tiene más de un webhook creado con la misma URL, y desea eliminar esa URL, debe eliminar todos los webhook que esten relacionados a esta URL.

📘
Sobre el campo Webhook
Para efectos de este API el campo WebhookId se conocerá cómo Webhook

El cuerpo transmitido por el POST es una estructura XML, en la que el nodo root Request encierra una sección Webhook, que requiere un id de Webhook.

XML Request

<?xml version="1.0" encoding="UTF-8" ?>
<Request>
	<Webhook>f8bf8d09-1647-4136-b405-03c44f228cf5</Webhook>
</Request>
Errores
Código de error	Descripción
6	E006: Unexpected internal error (Error interno inesperado)
89	E089: Required %s field is missing (Falta el campo obligatorio)
97	E097: Field %s has a wrong value (El campo %s tiene un valor incorrecto)
100	E100: Invalid Webhook ID (ID de Webhook inválido)
1000	Format Error Detected (Error de formato detectado)
Body Params
Action
string
Defaults to ProductRemove
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'ProductRemove' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Acción no válida'.

ProductRemove
Format
string
Defaults to XML
Si se suministra, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

XML
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

REQUEST:
npx api install "@linio-developers-hub/v500#1a37g1lx5md3h95yf"

import linioDevelopersHub from '@api/linio-developers-hub';

linioDevelopersHub.post_newEndpoint({Action: 'ProductRemove', Format: 'XML'}, {Action: 'DeleteWebhook'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));


RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            DeleteWebhook
        </RequestAction>
        <ResponseType/>
        <Timestamp>
            2015-07-01T11:11:11+0000
        </Timestamp>
    </Head>
    <Body/>
</SuccessResponse>