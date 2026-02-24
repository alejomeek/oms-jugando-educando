Enlistar Eventos
get
https://sellercenter-api.falabella.com/?Action=GetWebhookEntities


Obtiene todos los eventos disponibles
Las etiquetas XML tienen el siguiente significado:

Nombre del campo

Tipo

Descripción

Name

String

Identificador de cadena legible de una entidad

EventName

String

Identificador de cadena legible de un evento

EventAlias

String

Identificador de cadena legible de un evento combinado con su entidad

Metadata
Action
string
required
Defaults to GetWebhookEntities
Nombre de la función que se va a llamar. Es obligatorio y debe ser 'GetWebhookEntities' en este caso. Si se omite, se devuelve un error 'E001: Parameter Action is mandatory'. Si se suministra una cadena de función desconocida, se devuelve un mensaje de error "E008: Invalid Action".

GetWebhookEntities
Timestamp
date
required
La hora actual en formato ISO8601 relativa a UTC (p. Ej., Marca de tiempo = 2015-04-01T10: 00: 00 + 02: 00 para Berlín), de modo que las llamadas no puedan ser reproducidas por un tercero que espíe (es decir, aquellas llamadas demasiado lejos en el pasado o en el futuro producen un mensaje de error). Obligatorio. Si no se proporciona, aparece el mensaje de error 'E001: La marca de tiempo del parámetro es obligatoria'. Si la marca de tiempo es demasiado antigua o está en el futuro, se devuelve un mensaje de error "E003: Timestamp has expired" (Timestamp expiró).

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

Format
string
Defaults to XML
Formato de salida. Si se proporciona, debe ser "JSON" o "XML". Si no se suministra, se asume que es "XML".

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

linioDevelopersHub.getqcstatus({Action: 'GetWebhookEntities', Format: 'XML'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));

RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
    <Head>
        <RequestId/>
        <RequestAction>
            GetWebhookEntities
        </RequestAction>
        <ResponseType>
            Entities
        </ResponseType>
        <Timestamp>
            2016-06-02T11:07:53+0200
        </Timestamp>
    </Head>
    <Body>
        <Entities>
            <Entity>
                <Name>
                    Feed
                </Name>
                <Events>
                    <Event>
                        <EventName>
                            Completed
                        </EventName>
                        <EventAlias>
                            onFeedCompleted
                        </EventAlias>
                    </Event>
                    <Event>
                        <EventName>
                            Created
                        </EventName>
                        <EventAlias>
                            onFeedCreated
                        </EventAlias>
                    </Event>
                </Events>
            </Entity>
            <Entity>
                <Name>
                    Metrics
                </Name>
                <Events>
                    <Event>
                        <EventName>
                            Updated
                        </EventName>
                        <EventAlias>
                            onMetricsUpdated
                        </EventAlias>
                    </Event>
                </Events>
            </Entity>
            <Entity>
                <Name>
                    Order
                </Name>
                <Events>
                    <Event>
                        <EventName>
                            Created
                        </EventName>
                        <EventAlias>
                            onOrderCreated
                        </EventAlias>
                    </Event>
                    <Event>
                        <EventName>
                            StatusChanged
                        </EventName>
                        <EventAlias>
                            onOrderItemsStatusChanged
                        </EventAlias>
                    </Event>
                </Events>
            </Entity>
            <Entity>
                <Name>
                    Product
                </Name>
                <Events>
                    <Event>
                        <EventName>
                            Created
                        </EventName>
                        <EventAlias>
                            onProductCreated
                        </EventAlias>
                    </Event>
                    <Event>
                        <EventName>
                            QcStatusChanged
                        </EventName>
                        <EventAlias>
                            onProductQcStatusChanged
                        </EventAlias>
                    </Event>
                    <Event>
                        <EventName>
                            Updated
                        </EventName>
                        <EventAlias>
                            onProductUpdated
                        </EventAlias>
                    </Event>
                </Events>
            </Entity>
            <Entity>
                <Name>
                    Statistics
                </Name>
                <Events>
                    <Event>
                        <EventName>
                            Updated
                        </EventName>
                        <EventAlias>
                            onStatisticsUpdated
                        </EventAlias>
                    </Event>
                </Events>
            </Entity>
        </Entities>
    </Body>
</SuccessResponse>