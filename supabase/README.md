# Schema de Base de Datos - OMS Jugando y Educando

Este directorio contiene el schema completo de la base de datos PostgreSQL para el sistema OMS.

## Contenido

- `schema.sql` - Script SQL completo con:
  - Tabla `orders` (órdenes unificadas de todos los canales)
  - Tabla `order_status_history` (historial de cambios de estado)
  - Índices para optimización de queries
  - Función y trigger para actualización automática de timestamps
  - Políticas de Row Level Security (RLS)

## Estructura de Tablas

### 📦 Tabla: `orders`

Almacena todas las órdenes de Mercado Libre y Wix en formato normalizado.

**Campos principales:**
- `id` - UUID único generado automáticamente
- `external_id` - ID original del canal (ML order ID o Wix order number)
- `channel` - Canal de origen: 'mercadolibre' o 'wix'
- `status` - Estado actual: 'nuevo', 'preparando', 'enviado', 'entregado', 'cancelado'
- `pack_id` - (Solo ML) Agrupa múltiples órdenes del mismo carrito
- `customer` - JSONB con información del cliente (estructura varía por canal)
- `items` - JSONB array con los productos del pedido
- `shipping_address` - JSONB con dirección de envío

**Constraint importante:** `UNIQUE(channel, external_id)` previene duplicados al sincronizar.

### 📜 Tabla: `order_status_history`

Registra todos los cambios de estado para auditoría completa.

**Campos principales:**
- `order_id` - Foreign key a `orders(id)`
- `old_status` - Estado anterior
- `new_status` - Nuevo estado
- `changed_by` - Usuario que realizó el cambio
- `changed_at` - Timestamp del cambio

## Cómo Aplicar el Schema

### Opción 1: Dashboard de Supabase (Recomendado para MVP)

1. Accede a tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a la sección **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido completo de `schema.sql`
5. Haz click en **Run** para ejecutar el script
6. Verifica que las tablas se crearon correctamente en la pestaña **Table Editor**

### Opción 2: CLI de Supabase (Para desarrollo local)

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Iniciar Supabase localmente
supabase start

# 3. Aplicar el schema
supabase db reset

# O aplicar manualmente:
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/schema.sql
```

### Opción 3: Cliente PostgreSQL (psql)

Si tienes acceso directo a PostgreSQL:

```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/schema.sql
```

## Verificación Post-Instalación

Después de aplicar el schema, verifica que todo esté correcto:

```sql
-- Listar todas las tablas
\dt

-- Verificar estructura de orders
\d orders

-- Verificar estructura de order_status_history
\d order_status_history

-- Listar todos los índices
\di

-- Verificar que el trigger existe
\df update_updated_at_column

-- Verificar políticas RLS
\dp orders
\dp order_status_history
```

Deberías ver:
- ✅ 2 tablas creadas: `orders`, `order_status_history`
- ✅ 7 índices creados
- ✅ 1 función: `update_updated_at_column()`
- ✅ 1 trigger: `update_orders_updated_at`
- ✅ 2 políticas RLS activas

## Queries de Ejemplo

### Insertar una orden de prueba

```sql
INSERT INTO orders (
  external_id,
  channel,
  status,
  order_date,
  total_amount,
  currency,
  customer,
  items
) VALUES (
  'TEST-001',
  'wix',
  'nuevo',
  NOW(),
  59900,
  'COP',
  '{"source": "wix", "id": "test-user", "email": "test@example.com"}'::jsonb,
  '[{"sku": "16287", "title": "Producto Test", "quantity": 1, "unitPrice": 59900, "fullPrice": 59900, "currency": "COP"}]'::jsonb
);
```

### Consultar órdenes por estado

```sql
SELECT id, external_id, channel, status, total_amount, order_date
FROM orders
WHERE status = 'nuevo'
ORDER BY order_date DESC
LIMIT 10;
```

### Cambiar estado y registrar en historial

```sql
-- Actualizar orden
UPDATE orders
SET status = 'preparando'
WHERE id = 'your-order-uuid';

-- Registrar en historial
INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
VALUES ('your-order-uuid', 'nuevo', 'preparando', 'manual');
```

### Ver historial de una orden

```sql
SELECT
  h.changed_at,
  h.old_status,
  h.new_status,
  h.changed_by,
  h.notes
FROM order_status_history h
WHERE h.order_id = 'your-order-uuid'
ORDER BY h.changed_at DESC;
```

## Migraciones Futuras

Para cambios posteriores al schema:

1. Crea un nuevo archivo `migration_YYYYMMDD.sql` en este directorio
2. Documenta los cambios en este README
3. Aplica la migración usando el mismo proceso

## Seguridad (RLS)

⚠️ **Importante para Producción:**

Las políticas RLS actuales son permisivas (`USING (true)`) para facilitar el desarrollo del MVP. Antes de pasar a producción con autenticación real:

1. Elimina las políticas permisivas:
   ```sql
   DROP POLICY "Allow all access to orders" ON orders;
   DROP POLICY "Allow all access to history" ON order_status_history;
   ```

2. Crea políticas restrictivas basadas en roles de usuario
3. Implementa autenticación en el frontend
4. Prueba exhaustivamente los permisos

## Backup y Restore

### Crear backup

```bash
# Desde Supabase CLI
supabase db dump -f backup.sql

# O con pg_dump
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Restaurar desde backup

```bash
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

## Troubleshooting

### Error: "relation already exists"

Si las tablas ya existen, elimínalas primero:

```sql
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

Luego vuelve a ejecutar `schema.sql`.

### Error: "permission denied"

Asegúrate de estar usando el usuario `postgres` o un usuario con privilegios suficientes.

### Verificar permisos

```sql
-- Ver permisos del usuario actual
\du

-- Ver políticas RLS activas
SELECT * FROM pg_policies WHERE tablename IN ('orders', 'order_status_history');
```

## Soporte

Para más información sobre Supabase:
- [Documentación oficial](https://supabase.com/docs)
- [Guía de PostgreSQL](https://supabase.com/docs/guides/database)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
