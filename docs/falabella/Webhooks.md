Webhooks
Notificación desde Falabella a un URL indicada por el Seller para notificar eventos

Es importante siempre contar con los webhook en tu integración, así que te podrás enterar de forma casi instantánea de diferentes cambios en tu producto y/o órdenes

Eventos
Establece una conexión Server to Server en la cual proactivamente falabella.com notificará una serie de eventos predefinidos anteriormente por el comercio. A diferencia de las APIS, es el webhook quien notifica al comercio apenas ocurra un evento, sin que este lo solicite y no al revés.

Los eventos que podemos encontrar son los siguientes:

Eventos relacionados a Feed

onFeedCompleted: Notificación de Feed ejecutado, puede ser con o sin rechazos.
onFeedCreated: Notificación de creación de Feed.
Eventos relacionados a Ordenes

onOrderCreated: Notificación de generación de creación de una nueva Orden.
onOrderItemsStatusChanged: Notificación cuando existe un cambio de estado en los ítems.
En el caso de las órdenes, en caso de fallas en el feed, este no enviará un evento de error, por lo cual es recomendable usar complementariamente FeedStatus para hacer seguimiento del feed

Eventos relacionados a Productos

onProductCreated: Notificación de creación de nuevo producto.
onProductQcStatusChanged: Notificación cuando existe un cambio en los puntos de contenido.
onProductUpdated: Notificación cuando existe un cambio en el estado de un producto.
Configuración
Los Webhook pueden ser configurados de dos formas distintas, vía portal de Falabella Seller center y vía API.

Configuración vía Portal

Ingresar a https://sellercenter.falabella.com/
Una vez adentro, hacer clic en "Mi Cuenta".
Desplegado el menú, ingresar a "Integraciones".
Una vez adentro haz clic en la pestaña “Webhooks”, cliquea Add Webhooks.
Agrega la URL para recibir los mensajes y elige los eventos.

Configuración vía API

Para la creación de APIS, se debe seguir las indicaciones de creación en el apartado de Creación de webhook en Webhooks Endpoints (Aquí), utilizando nuestra API createwebhook, así como también la eliminación de los mismos utilizando DeleteWebhook (Aquí).

Respuestas de Webhook
Puedes ver todos tipos de respuesta que entregará el webhook en el apartado de Paylods de Webhook en Webhooks Endpoints (Aquí)

Reintentos de devolución en llamada
Falabella Seller Center realizará reintentos de la devolución de llamada del evento de webhook si el sistema basado en el vendedor no está disponible por cualquier motivo. Además, se programará una demora en la ejecución posterior de la devolución de llamada para permitir la recuperación del sistema del vendedor. Este proceso continuará hasta transcurridos 30 días.

Después de este período, la devolución de llamada se eliminará del sistema de Falabella Seller Center, independientemente de si tuvo éxito o no. No se realizarán más intentos de devolución de llamada después de este punto.

Para obtener más detalles sobre los posibles retrasos en la ejecución de las devoluciones de llamada tras una respuesta fallida, consulta la siguiente tabla."

Intentos	Minutos	Retraso adicional en minutos	Retraso adicional en minutos
Retry 1	1	00:00:01	00:00:01
Retry 2	5	00:00:05	00:00:06
Retry 3	10	00:00:10	00:00:16
Retry 4	30	00:00:30	00:00:46
Retry 5	60	00:01:00	00:01:46
Retry 6	120	00:02:00	00:03:46
Retry 7	300	00:05:00	00:08:46
Retry 8	600	00:10:00	00:18:46
Retry 9	1440	01:00:00	01:18:46
Retry 10	1440	01:00:00	02:18:46
Retry 11	1440	01:00:00	03:18:46
Retry N	1440	01:00:00	Anterior + 1hrs