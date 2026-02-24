Opera con Nuestras APIS
Para operar con nuestras APIs, es fundamental que tu negocio esté registrado como partner en Falabella y que cuentes con tu User ID y API Key, obtenidos a través de https://sellercenter.falabella.com/. Los detalles de este proceso se explicarán más adelante.

Es importante destacar que, ya sean llamadas GET o POST, siempre se generará una respuesta, la cual puede variar en detalle dependiendo de la acción solicitada, independientemente de si fue exitosa o no.

Estas respuestas pueden estar en formato XML o JSON, y esta preferencia se puede configurar mediante los parámetros de entrada según corresponda.

¿Cómo obtener tus credenciales?
Credenciales de acceso para un usuario ya creado en Falabella Seller Center
Como se mencionó anteriormente, para operar con nuestra API, necesitas tener acceso a la API Key. Para obtenerla, sigue estos pasos:

Ingresa a https://sellercenter.falabella.com/ con tu usuario y contraseña de Falabella Seller Center.
Una vez dentro, haz clic en "Mi cuenta".
En el menú desplegable, selecciona "Usuarios".
El correo será tu User ID y tu API Key, estará en la columna de Api Key.
Crear un nuevo usuario
El administrador debe ingresar a https://sellercenter.falabella.com/ con su usuario y contraseña de Falabella Seller Center.

Una vez dentro, haz clic en "Mi cuenta".
En el menú desplegable, haz clic en "Usuarios".
Luego haz clic en "Agregar Usuario".
Completa los datos como correo electrónico, nombre, rol, entre otros.
Para que el nuevo usuario pueda acceder a la API Key, debe seguir los pasos descritos en "Credenciales de acceso para un usuario ya creado en Falabella Seller Center".
Roles y privilegios
No todos los usuarios de Falabella Seller Center pueden invocar todos los métodos de la API.

Las llamadas a la API no pueden ser anónimas. Cada llamada se realiza en nombre de un usuario específico de Falabella Seller Center, identificado mediante el parámetro UserID y autenticado con su correspondiente API Key. Para poder hacer una llamada a un método en particular, el usuario debe tener un rol específico, según se detalla a continuación.

Roles y Métodos Disponibles
Role	Available Methods
Seller API Access	All
Seller API Product Access	GetProducts, ProductCreate, ProductUpdate, ProductRemove, Image, GetBrands, GetCategoryTree, GetCategoryAttributes, GetAttributes, FeedList, FeedOffsetList, FeedCount, FeedStatus, FeedCancel
Seller API Order Access	GetOrders, GetOrder, GetOrderItems, GetMultipleOrderItems, SetStatusToCanceled, SetStatusToReadyToShip, SetStatustoShipped, SetStatusToFailedDelivered, SetStatusToDelivered, GetFailureReasons, GetShipmentProviders
Headers de la Solicitud
🚧
Headers requeridos
Todas las solicitudes deben incluir el header User-Agent con el siguiente formato:

SELLER_ID/TECNOLOGÍA_USADA/VERSIÓN_TECNOLOGÍA/TIPO_INTEGRACIÓN/CÓDIGO_UNIDAD_DE_NEGOCIO

SELLER_ID: Corresponde a tu ID de vendedor. Si no lo recuerdas, puedes encontrarlo en el Seller Center de Falabella bajo "Mi cuenta", o consultarlo mediante el endpoint GetSellerByUser.
TECNOLOGÍA_USADA: Lenguaje o tecnología utilizada en la integración (por ejemplo, PHP, Node, Python).
VERSIÓN_TECNOLOGÍA: Versión de la tecnología utilizada (por ejemplo, 8.1.7).
TIPO_INTEGRACIÓN: Este campo varía según el tipo de integración:
Si eres un negocio que se integra directamente con Falabella: PROPIA
Si eres un integrador que conecta múltiples negocios: NOMBRE_DEL_INTEGRADOR
CÓDIGO_UNIDAD_DE_NEGOCIO: Código del país con el que te integras:
Chile: FACL
Colombia: FACO
Perú: FAPE
¿Eres un negocio que se integra directamente con Falabella?

Ejemplo:
User-Agent: JJJ123/PHP/8.1.7/PROPIA/FACL

¿Eres un integrador de múltiples negocios?

Ejemplo:
User-Agent: JJJ123/PHP/8.1.7/MYINTEGRATOR/FACL

Puedes revisar más detalles sobre este header en MDN - User-Agent

Datos adicionales en POST
Como hemos visto, todos los métodos se ejecutan vía HTTP, algunos mediante GET y otros mediante POST.

Todas las llamadas siempre deben incluir los siguientes parámetros:
Action, Timestamp, UserID, Version, y Signature.

A menudo se agregan parámetros adicionales según el método.
Por ejemplo, el endpoint GetProducts acepta parámetros adicionales como Search.

A continuación, se muestra un ejemplo del contenido adicional enviado en el body para el método ProductUpdate:

>

📘 GET o POST
El uso de los métodos GET o POST depende de la acción a ejecutar y está definido en esta documentación. Incluso si no es necesario enviar datos adicionales en la solicitud, se debe usar POST si así lo especifica el método.

📘 Límite de tamaño en solicitudes POST
Según la configuración estándar del servidor de Seller Center, el tamaño máximo del cuerpo de una solicitud POST es de 128MB.

📘 Consideraciones con JSON
Cuando trabajes con JSON, todos los valores deben tratarse como strings, incluyendo números o booleanos. Ejemplo:

>

Resultados sin datos
Algunos métodos devuelven documentos XML extensos. Por ejemplo, GetProducts devuelve un documento XML muy largo con el listado de cada producto. La sintaxis de estas respuestas se explica en detalle en la página de referencia del método correspondiente.

Sin embargo, varios métodos no devuelven información en el cuerpo. En estos casos, igualmente se genera una respuesta que llamamos SuccessResponse. Dependiendo del parámetro Format enviado, puede devolverse en formato JSON o XML (puedes ver ambos ejemplos a continuación):

XML
JSON

<?xml version="1.0" encoding="UTF-8"?>
<SuccessResponse>
  <Head>
    <RequestId>13e55362-3cc4-446b-b3db-c1df0900ae9e</RequestId>
    <RequestAction>PriceFeed</RequestAction>
    <ResponseType></ResponseType>
    <Timestamp>2015-07-01T11:11:11+0000</Timestamp>
  </Head>
  <Body/>
</SuccessResponse>
Los campos dentro de la sección <Head> siempre son los mismos, independientemente de si el método devuelve datos dentro del <Body> o no. El significado de cada campo en una SuccessResponse es el siguiente:


Nombre	Tipo	Descripción
RequestId	UUID	Identificador único para esta solicitud. Se utiliza para hacer seguimiento mediante Feeds.
RequestAction	String	Nombre del método que fue ejecutado (es decir, el valor del parámetro Action de la solicitud).
ResponseType	String	Tipo de respuesta contenida en el Body, o vacío si no hay contenido.
Timestamp	DateTime	Momento de la ejecución de la solicitud, en formato ISO 8601.
Body	Subsection	Información adicional, descrita según la documentación del método correspondiente.
De forma similar, existe una estructura de respuesta para errores: ErrorResponse. Esta también contiene una sección <Body>, que muchas veces puede estar vacía, pero que puede incluir detalles adicionales sobre el error. A continuación, un ejemplo de mensaje de error con contenido en el cuerpo:


XML
JSON

<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse>
  <Head>
    <RequestAction>Price</RequestAction>
    <ErrorType>Sender</ErrorType>
    <ErrorCode>1000</ErrorCode>
    <ErrorMessage>Format Error Detected</ErrorMessage>
  </Head>
  <Body>
    <ErrorDetail>
      <Field>StandardPrice</Field>
      <Message>Field must contain a positive number with a dot as decimal
        separator and 2 decimals (e.g. 120.00)
      </Message>
      <Value>10.0x</Value>
      <SellerSku>Example Seller SKU</SellerSku>
    </ErrorDetail>
  </Body>
</ErrorResponse>


Aquí también, los campos tienen un significado fijo en todos los métodos:

Nombre	Tipo	Descripción
RequestAction	String	Método que provocó el error.
ErrorType	String	Origen del error (Sender o Platform).
ErrorCode	Integer	Código interno del error (ver sección de Errores).
ErrorMessage	String	Mensaje de error legible por humanos.
ErrorDetail	Subsection	La respuesta puede contener estas subsecciones en el Body, entregando detalles específicos del error. Se pueden incluir hasta 50 ErrorDetails.
Errores
Como se describió anteriormente, cuando un endpoint no puede ejecutarse, se devuelve un mensaje de error con el siguiente formato:

XML

<?xml version="1.0" encoding="UTF-8"?>
<ErrorResponse>
  <Head>
    <RequestAction>GetOrder</RequestAction>
    <ErrorType>Sender</ErrorType>
    <ErrorCode>[number]</ErrorCode>
    <ErrorMessage>E0[number]: [error message]</ErrorMessage>
  </Head>
  <Body/>
</ErrorResponse>

 
Errores Globales
Código de Error	Mensaje
1	E001: Parameter %s is mandatory (El parámetro es obligatorio)
2	E002: Invalid Version (Versión inválida)
3	E003: Timestamp has expired (La marca de tiempo ha expirado)
4	E004: Invalid Timestamp format (Formato de marca de tiempo inválido)
5	E005: Invalid Request Format (Formato de solicitud inválido)
6	E006: Unexpected internal error (Error interno inesperado)
7	E007: Login failed. Signature mismatching (Inicio de sesión fallido. Firma no coincide)
8	E008: Invalid Action (Acción inválida)
9	E009: Access Denied (Acceso denegado)
10	E010: Insecure Channel (Canal inseguro)
11	E011: Request too Big (Solicitud demasiado grande)
429	E429: Too many requests (Demasiadas solicitudes)
1000	Internal Application Error (Error interno de la aplicación)
30	E030: Empty Request (Solicitud vacía)