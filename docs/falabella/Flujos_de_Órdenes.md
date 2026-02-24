Flujos de Órdenes
Para poder operar con nuestras APIS es crucial que entiendas el flujo de un producto.

Estados de los item de una Orden
El flujo de procesamiento de órdenes contempla un total de 10 estados, de los cuales dos —ready_to_ship y cancel— pueden ser activados directamente por el comercio.

Estos estados se encuentran a nivel de ítem, y pueden consultarse mediante la API GetOrderItems. Para revisar el estado a nivel de orden completa, puedes utilizar la API GetOrder, donde el campo status devolverá un arreglo con todos los estados asociados a los ítems incluidos en la orden.

Los estados disponibles son los siguientes:

Estados de Compras

pending: Estado inicial en el que se crea la orden y el cual se obtenido en la primera llamada del GetOrders (aquí) o GetOrder(aquí)o desde la notificación de creación de orden en el evento de webhook (aquí).
ready_To_Ship: Seller confirma está listo para despachar el producto (orden). A partir de este estado la orden no puede ser cancelada por el Seller ni por el cliente.
shipped: Seller entrega paquete a operador logistico o a logistica Falabella, puede ser retiro o entrega en punto de entrega. Este estado se registramos internamente para medir cumplimiento de entrega de primera milla del seller (OTS= On Time Seller) que se usa para medir el nivel de Fplus(que mide que se cumpla el traspaso de responsabilidad al transporte en base a la fecha prometida de despacho).
delivered: Seller se entera vía Webhook o API GetOrders que el cliente final recibió la orden. Este estado gatilla el pago al Seller.
failed: Si luego de 3 intentos (puede depender del operador) de entrega al cliente final, no podemos entregar el producto, la orden queda en estado fallido.
canceled: Estado terminal de una orden. (puede ser gatillado, por el comercio, por clientes, por agentes o proveedor logístico).
Estados de Postventa

return_ship_by_customer: Estado transitorio gatillado cuando producto fue devuelto por el cliente a oficina, transporte autorizado o locales del holding Falabella (No se genera cuando se genera la devolución, sino cuando cliente entrega producto).
return_awaiting_for_approval: Estado transitorio, en este estado el seller debe aceptar o rechazar la devolución. Si el Seller rechaza solicitud se entra en proceso de disputa. Tienen 72 hrs para apelar antes de que se acepte automáticamente.
returned: Cuando se rechaza la disputa del Seller o bien el Seller no genera disputa o acepto la devolución.
returned_rejected: Falabella acepta el proceso de disputa del Seller.
APIS
APIS del flujo de órdenes

GetOrders (aquí): Trae órdenes desde una fecha seleccionada hasta la hora y fecha actual, y permite agregar filtros como "estado" específico (Ej: pending), entre otros. (Actualmente contamos con una versión 2.0 de este endpoint)
GetOrder(aquí): Trae los datos de una orden específica. (Actualmente contamos con una versión 2.0 de este endpoint)
GetOrderItems (aquí): Trae los artículos de una orden específica.
GetMultipleOrderItems (aquí): Trae los artículos de un arreglo de órdenes.
SetstatustopacketbyMaketplace (aquí): Marcar articulo como embalado y devuelve nombre de transporte e identificador interno del paquete o bulto a enviar en el que se debe empacar el ítem. (Deprecado, esta información ahora puede obtenerse a través de GetOrderItem)
GetTrackingCode (aquí): Trae el código de seguimiento de envío, necesario para generar la etiqueta. (Deprecado, esta información ahora puede obtenerse a través de GetOrderItem)
GetDocument (aquí): Recupera etiqueta. En caso que el comercio este suscrito a etiquetas PDF el mimetype de la respuesta será "application/pdf"; en caso que el comercio este suscrito a etiquetas ZPL el mimetype será "text/plain". El mimetype indica el tipo de decodificación necesario a tulizar en el BASE64 que viene el la respuesta (atributo file)
SetStatusToReadyToShip(aquí): Marcar articulo como listo para ser enviado
SetInvoicePDF (aquí): Carga de documento tributario.
SetStatustoCanceled (aquí): Cancela la orden (paquete) en el cual se encuentra el ítem solicitado, solo si este se encuentra en estado "pending"
Calcular el valor total de una venta
📘
Calcular el valor total de una venta para documento tributarios
Para obtener el valor total de una orden debes considerar lo siguiente:

Tener el OrderId al cual deseas calcular el valor total
Debes utilizar GetOrderItems o GetMultipleOrderItems para obtener el detalle de la orden.
El valor final con el cual deberán emitir el documento tributario, que corresponde al campo "Gran Total" de Falabella Seller Center, será la suma de los campos PaidPrice, y ShippingAmount, para cada producto contenido en la orden.
Es importante considerar este cálculo cómo la forma adecuada para obtener el valor final de la venta, ya que caso de que tu comercio cuente con promociones especiales, el monto obtenido del campo Price, de las APIs GetOrder o GetOrders, podría diferir, ocasionando problemas en la generación de documentos tributarios.

API GetOrderItems

API GetMultipleOrderItems

Uso de APIS para la generación de un flujo de compra
¿Cómo saber si se generó una venta, si el producto llego al cliente o algún cambio de estado?
Existen dos métodos por los cuales podemos enterarnos de que se generó una venta o si se generó un cambio de estado, el ideal es siempre utilizarlos de forma complementaria:

Uso de_WebHook_: Se debe configurar los eventos asociados a "órdenes", así cada vez que se genere una venta, se nos notificará a la url indicada, se recomienda posteriormente usar GetOrders, para registrar los datos de la orden.
Uso de Api_GetOrders_: Se puede generar un cron job que consulte el api cada X tiempo, generando filtros por estados para traer las ordenes con estado Pending, que son aquellas que aún no se han procesado, para posteriormente guardar datos claves de la orden como el OrderID. También se pueden filtrar otros estados si se desea hacer seguimientos a la orden (Pending, Ready_To_Ship,Shipped, Delivered, Failed y Cancel )
¿Qué hacer una vez que ya sabemos que llego una venta?
Si posees Fullfilment by Seller

Una vez registrada una nueva venta y almacenado los datos de la orden, se debe utilizar el método GetOrderItems para traer los artículos asociados a la orden.
En el caso de que estés trabajando con un lote de órdenes, recuerda que puedes usar GetMultipleOrderItems.
De este endpoint hay campos importantes a utilizar como OrderItemIds, PackageId o GetTrackingCode, que serán input para usar más adelante en el flujo.
En caso de que alguno de estos campos no esté disponible al momento de la creación de la orden, se debe reintentar el llamado hasta que el dato esté poblado.

Posteriormente, se debe generar la etiqueta utilizando GetDocument.

Finalmente, se debe marcar el producto como listo para el retiro con el API SetStatusToReadyToShip.
Recuerda que debes respetar la fecha de compromiso de entrega al proveedor logístico antes de entregar el paquete (PromisedShippingTime).

A partir de este punto, se debe utilizar el API SetInvoicePDF para cargar el documento tributario respectivo.

Si posees Fullfilment by Falabella (FBF):

Las órdenes FBF se reconocen con el atributo y valor ShippingType = Own Warehouse.
Es vital reconocer estas órdenes para no reducir inventario de la bodega propia, dado que el inventario para FBF está en las bodegas de Falabella.
Puedes utilizar GetOrder, GetOrderItems o GetMultipleOrderItems para obtener mayores detalles de la orden o de los ítems asociados, en caso de que lo requieras para alguno de tus sistemas.
Se puede hacer seguimiento de la evolución de los estados de la orden mediante GetOrders.
No se debe aplicar el API SetStatusToReadyToShip.
Al igual que en el flujo Fulfillment by Seller, puedes cargar tus boletas usando la API SetInvoicePDF.
📘
Seguimiento de estados
Se puede hacer seguimiento de la evolución de los estados activando el el evento de onOrderItemsStatusChanged del webhook o bien mediante el uso del API GetOrders

¿Cómo puedo cancelar una orden?
Las Órdenes solo pueden ser canceladas en estado pending , tanto el cliente cómo el comercio puede realizar una cancelación del producto, en el caso que la cancelación sea por parte del comercio, se generará una penalización.

Flujo de Órdenes
Puedes hacer clic en la imagen para poder visualizarla o puedes descargar haciendo clic en el botón derecho de mouse y seleccionando guardar cómo, para tener la imagen en su resolución original.

