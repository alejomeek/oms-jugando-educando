Creación de Webhook
post
https://sellercenter-api.falabella.com/?Action=CreateWebhook


En base a una URL entregada, permite la generación de webhooks para una serie de eventos

📘
Solicitud de carga útil
El cuerpo transmitido por el POST es una estructura XML.

Eventos relacionados a Feed

onFeedCompleted: Notificación de Feed ejecutado, puede ser con o sin rechazos
onFeedCreated: Notificación de creación de Feed
Eventos relacionados a Ordenes

onOrderCreated: Notificación de generación de creación de una nueva Orden
onOrderItemsStatusChanged: Notificación cuando existe un cambio de estado en los ítems.
Eventos relacionados a Productos

onProductCreated: Notificación de creación de nuevo producto
onProductQcStatusChanged: Notificación cuando existe un cambio en los puntos de contenido
onProductUpdated: Notificación cuando existe un cambio en el estado de un producto
Cuerpo de la solicitud
Request Body Example

<?xml version="1.0" encoding="UTF-8" ?>
<Request>
	<Webhook>
		<CallbackUrl>http://example.com/callback</CallbackUrl>
    <Events>
      <Event>onOrderCreated</Event>
      <Event>onProductCreated</Event>
    </Events>
	</Webhook>
</Request>
Las etiquetas XML tienen el siguiente significado:

Nombre del campo	Tipo	Comentario
CallbackUrl	String	La URL del webhook a la que llamará Falabella Seller Center
Events	Event[]	Lista de eventos relacionados con webhook identificados por su alias, consulte la llamada GetWebhookEntities para obtener más detalles.
Descripción del error

Código de error

Descripción del error

5

Invalid Request Format (Formato de solicitud no válido)

6

Unexpected internal error
(may mean feature is not configured or unknown error occurred) (Error interno inesperado
(puede significar que la función no está configurada o que se ha producido un error desconocido))

89

Required field is missing (Falta el campo obligatorio)

98

Invalid Webhook Callback Url, "Given url is invalid" (La url dada no es válida)

99

Invalid Webhook Event Alias, "Events alias are not matching" (Los alias de los eventos no coinciden)

Ejemplo de respuesta de error
XML

<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse>
     <Head>
       <RequestAction>CreateWebhook</RequestAction>
       <ErrorType>Sender</ErrorType>
       <ErrorCode>96</ErrorCode>
       <ErrorMessage>
         E096: Invalid Webhook Event Alias, "Events alias are not matching"
       </ErrorMessage>
     </Head>
     <Body/>
</ErrorResponse>
Metadata
Action
string
required
Defaults to CreateWebhook
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'CreateWebhook' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error 'E008: Invalid Action'.

CreateWebhook
Timestamp
date
required
La hora actual en formato ISO8601 relativa a UTC (p. Ej., Marca de tiempo = 2015-04-01T10: 00: 00 + 02: 00 para Berlín), de modo que las llamadas no puedan ser reproducidas por un tercero que espíe (es decir, aquellas llamadas demasiado lejos en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se proporciona, aparece el mensaje de error 'E001: La marca de tiempo del parámetro es obligatoria'. Si la marca de tiempo es demasiado antigua o está en el futuro, se devuelve un mensaje de error "E003: Timestamp has expired" (Timestamp expiró).

Version
string
required
La versión de la API contra la que se va a ejecutar esta llamada, en formato mayor-punto-menor. Debe ser actualmente 1.0, aunque la versión real de la API sea 2.6.20. Si se omite, se devuelve un mensaje de error 'E001: Parameter Version is mandatory'.

Signature
string
required
La firma criptográfica que autentifica la solicitud. La persona que llama debe crear este valor calculando el hash SHA256 de la solicitud, utilizando la clave API del usuario especificado en el parámetro UserID. Obligatorio. Si se omite, se devuelve un mensaje de error 'E001: Parameter Signature is mandatory'. Si la firma es incorrecta, se devuelve un mensaje de error 'E007: Login failed. Signature mismatch'.

Format
string
Defaults to XML
Si se suministra, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

XML
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

linioDevelopersHub.post_newEndpoint({Action: 'CreateWebhook', Format: 'XML'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            CreateWebhook
        </RequestAction>
        <ResponseType>
            Webhook
        </ResponseType>
        <Timestamp>
            2016-06-03T16:11:19+0200
        </Timestamp>
    </Head>
    <Body>
        <Webhook>
            <WebhookId>
                7dffaa4e-1713-42c2-84ba-1d2fbd4537ab
            </WebhookId>
            <CreatedAt>
                2016-06-03T16:11:19+0200
            </CreatedAt>
        </Webhook>
    </Body>
</SuccessResponse>