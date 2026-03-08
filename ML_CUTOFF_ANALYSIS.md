# Análisis de Horarios de Corte (Cutoff) en Mercado Libre API

Este documento detalla un descubrimiento crucial sobre cómo la API de Mercado Libre gestiona y expone los horarios límite de despacho (Cutoff) tanto para **Colecta (Cross Docking)** como para **Mercado Envíos Flex (Self Service)**. Esta información es fundamental para la arquitectura y el diseño UX/UI del OMS (Order Management System).

## El Problema Inicial
Originalmente, intentábamos predecir o hardcodear los horarios de las furgonetas de colecta usando el endpoint `/shipping/schedule/cross_docking`. Sin embargo, nos topamos con tres obstáculos:
1. En cuentas Multi-Origen (Warehouse Management), los horarios de todas las tiendas (Bulevar, CEDI, Usaquén, etc.) llegan **mezclados** en un solo arreglo (facility `COXBG1` para Bogotá) sin poder discernir qué franja pertenece a qué tienda física.
2. Los fines de semana la API indica oficialmente que no hay colectas (`"work": false`), pero en la práctica (vía WhatsApp) Meli avisa sobre envíos extraordinarios de colecta en sábados.
3. El OMS no tenía forma de decirle de manera segura a la bodega: _"Debes empacar este paquete antes de las X horas"_.

## El Descubrimiento: El "Santo Grial" del Cutoff
Al inspeccionar el objeto crudo de pedidos (Orders -> Shipments) recientes, descubrimos que Mercado Libre expone el límite de tiempo exacto para alistar CADA PAQUETE de manera individual.

Esto se encuentra anidado en los detalles del envío particular:
`shipment.shipping_option.estimated_delivery_time.pay_before`

### ¿Qué es `pay_before`?
Históricamente, era la hora límite en la que el cliente debía pagar. Hoy en día (bajo el modelo ME2 Cross Docking y Flex), Mercado Libre ha reciclado (y mantenido) esta variable internamente en la API para representar **la hora de corte exacta (SLA o Cutoff) en la que el sistema espera que el vendedor entregue el paquete al transportista o furgoneta**.

## Casos Prácticos Analizados
Corrimos un script (en `scripts/test_ml_order.js`) contra la API real para validar esta teoría y obtuvimos éxito total:

### Ejemplo 1: Colecta (Cross Docking) - Pedido que se va "el lunes"
- **Orden:** `#2000015434568032` (CEDI)
- **Fecha de Compra:** Viernes a las 21:07 hs (Fuera del horario hábil).
- **Logística (`logistic_type`):** `cross_docking`
- **Output API (`pay_before`):** `2026-03-09T11:01:00.000-05:00` (LUNES a las 11:01 AM).
- **Conclusión:** Mercado Libre agendó obligatoriamente este paquete para la primera franja del lunes (Cuyo corte global coincide con las 11:01 AM). El Frontend de Meli lee esta fecha y le dice al usuario: _"Tienes que darle el paquete a la colecta que pasará el lunes"_.

### Ejemplo 2: Mercado Envíos Flex - Pedido "Hoy Mismo"
- **Orden:** `#2000015443296550` (Avenida 19)
- **Fecha de Compra:** Sábado a las 14:47 hs.
- **Logística (`logistic_type`):** `self_service`
- **Output API (`pay_before`):** `2026-03-07T16:00:00.000-05:00` (SÁBADO a las 16:00 hs).
- **Conclusión:** El algoritmo detectó que el cliente compró dentro de la ventana Flex del sábado e impuso la fecha límite a las 16:00 hs de hoy mismo.

### Ejemplo 3: Mercado Envíos Flex - Compra Nocturna
- **Orden:** `#2000015436116662` (Avenida 19)
- **Fecha de Compra:** Viernes a las 23:48 hs.
- **Logística (`logistic_type`):** `self_service`
- **Output API (`pay_before`):** `2026-03-07T13:00:00.000-05:00` (SÁBADO a las 13:00 hs).
- **Conclusión:** Dado que se compró de noche, el sistema agendó su corte para el límite Flex configurado al mediodía del día siguiente.

## Cómo implementar esto en la Configuración del OMS
Esta arquitectura simplifica masivamente la UI/UX del OMS, porque ya no tenemos que adivinar horarios, calcular zonas horarias, ni forzar al bodeguero a elegir "En qué tienda está".

Para renderizar qué pedidos se deben despachar cada día:

1. **Clasificar el Método de Envío:**
   Por cada envío, observar `shipment.logistic_type`.
   - Si es `cross_docking` -> Mostrar en la tarjeta "Colecta Mercado Libre".
   - Si es `self_service` -> Mostrar en la tarjeta "Envíos Flex (Motos)".

2. **Extraer el Cutoff del Paquete:**
   Obtener el objeto de fecha limitante local a partir de `shipment.shipping_option.estimated_delivery_time.pay_before`.

3. **Filtrar y Agrupar Visualmente:**
   - Si la fecha del `pay_before` cae en **HOY**: Mostrar los pedidos agrupados bajo subtítulos con su hora límite (Ej. "Límite: 11:01 AM", "Límite: 13:00 hs", "Límite: 16:00 hs").
   - Si la fecha de `pay_before` cae en el **FUTURO (ej. el lunes)**: Ocultarlo de la vista "Despachos Urgentes de Hoy" o ponerlo en una pestaña de "Alistamiento Temprano / Para mañana".
   - Si la fecha de `pay_before` es **PASADA** y el paquete no ha salido: Marcarlo en ROJO como "Atrasado".

### Ventaja de UX
El operario de bodega dejará de trabajar "a ciegas". Entrará al OMS y verá una línea de tiempo natural orquestada 100% por Mercado Libre. Si Mercado Libre manda una camioneta fantasma o extraordinaria un sábado a mediodía, el `pay_before` de los envíos que caigan la delatará automáticamente ("Tienes 5 paquetes que obligatoriamente deben irse a las 12:00"). 
El OMS se convierte en un simple e infalible intérprete de la voluntad transaccional de Meli.
