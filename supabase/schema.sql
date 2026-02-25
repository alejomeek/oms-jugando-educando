-- ============================================
-- OMS Didácticos Jugando y Educando
-- Schema de Base de Datos - Supabase PostgreSQL
-- ============================================

-- ============================================
-- TABLA: orders
-- Almacena todas las órdenes de todos los canales en formato normalizado
-- ============================================

CREATE TABLE orders (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,                 -- ID original (ML order ID, Wix order number, Falabella OrderId)
  channel TEXT NOT NULL CHECK (channel IN ('mercadolibre', 'wix', 'falabella')),

  -- Para Mercado Libre: soporte de packs
  pack_id TEXT,                           -- Solo ML: agrupa órdenes del mismo carrito
  shipping_id TEXT,                       -- Solo ML: ID de envío compartido

  -- Estado unificado en español
  status TEXT NOT NULL DEFAULT 'nuevo' CHECK (
    status IN ('nuevo', 'preparando', 'enviado', 'entregado', 'cancelado')
  ),

  -- Fechas
  order_date TIMESTAMPTZ NOT NULL,        -- Fecha de compra original
  closed_date TIMESTAMPTZ,                -- Fecha de pago/cierre
  created_at TIMESTAMPTZ DEFAULT NOW(),   -- Fecha de inserción en DB
  updated_at TIMESTAMPTZ DEFAULT NOW(),   -- Última actualización

  -- Montos
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'COP',

  -- Cliente (estructura JSONB para flexibilidad entre canales)
  customer JSONB NOT NULL,
  -- Ejemplo ML: {"source": "mercadolibre", "id": "666172639", "nickname": "DZR29"}
  -- Ejemplo Wix: {"source": "wix", "id": "uuid", "email": "x@example.com", "firstName": "Juan", "lastName": "Pérez", "phone": "+57123"}
  -- Ejemplo Falabella: {"source": "falabella", "id": "CC123456", "firstName": "Ana", "lastName": "Gómez", "email": "ana@example.com", "phone": "+57300"}

  -- Dirección de envío (JSONB porque estructura varía por canal)
  shipping_address JSONB,
  -- Estructura: {"street": "Calle 123", "city": "Bogotá", "state": "Cundinamarca", "zipCode": "110111", "receiverName": "...", "receiverPhone": "..."}

  -- Items del pedido (JSONB array)
  items JSONB NOT NULL,
  -- Array de objetos: [{"sku": "16287", "title": "...", "quantity": 1, "unitPrice": 59900, "imageUrl": "...", "variationAttributes": [...]}]

  -- Metadatos adicionales
  payment_info JSONB,                     -- Info de pago
  tags TEXT[],                            -- Tags de ML o flags personalizados
  notes TEXT,                             -- Comentarios internos del operador
  logistic_type TEXT,                     -- Solo ML: 'fulfillment' (Full) | 'self_service' (Flex) | 'cross_docking' (Colecta)

  -- Constraint para evitar duplicados
  UNIQUE(channel, order_id)
);

-- ============================================
-- ÍNDICES PARA TABLA orders
-- Mejoran el performance de queries comunes
-- ============================================

CREATE INDEX idx_orders_channel ON orders(channel);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX idx_orders_pack_id ON orders(pack_id) WHERE pack_id IS NOT NULL;
CREATE INDEX idx_orders_external_id ON orders(external_id);

-- ============================================
-- TABLA: order_status_history
-- Registra todos los cambios de estado para auditoría y trazabilidad
-- ============================================

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,                        -- user ID o "system" (para MVP siempre "manual")
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT                              -- Notas opcionales del cambio
);

-- ============================================
-- ÍNDICES PARA TABLA order_status_history
-- ============================================

CREATE INDEX idx_order_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_history_changed_at ON order_status_history(changed_at DESC);

-- ============================================
-- FUNCIÓN: update_updated_at_column
-- Actualiza automáticamente el campo updated_at cuando se modifica una fila
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: update_orders_updated_at
-- Ejecuta la función antes de cada UPDATE en la tabla orders
-- ============================================

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Preparado para futuro, por ahora permitir todo para MVP
-- ============================================

-- Habilitar RLS en ambas tablas
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para MVP (sin autenticación)
-- TODO: Reemplazar con políticas más restrictivas cuando se implemente autenticación

CREATE POLICY "Allow all access to orders"
  ON orders
  FOR ALL
  USING (true);

CREATE POLICY "Allow all access to history"
  ON order_status_history
  FOR ALL
  USING (true);

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- NOTA: Para verificar las tablas e índices creados, usa el Table Editor
-- de Supabase o ejecuta estos comandos en psql local:
-- \dt (para ver tablas)
-- \di (para ver índices)

-- ============================================
-- ANALYTICS SUPPORT — run these if not exists
-- ============================================

-- Index para agrupar por fecha y canal (analytics diarios/semanales)
CREATE INDEX IF NOT EXISTS idx_orders_order_date_channel ON orders(order_date DESC, channel);

-- Index compuesto para filtros por canal y status
CREATE INDEX IF NOT EXISTS idx_orders_channel_status ON orders(channel, status);

-- Index para queries de revenue
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- ============================================
-- MIGRACIÓN: Agregar canal Falabella
-- Ejecutar en Supabase SQL Editor si la DB ya existe
-- ============================================

-- Eliminar constraint de canal existente (el nombre puede variar)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%channel%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

-- Agregar constraint actualizado con 'falabella'
ALTER TABLE orders ADD CONSTRAINT orders_channel_check
  CHECK (channel IN ('mercadolibre', 'wix', 'falabella'));

-- ============================================
-- MIGRACIÓN: Historial de actividad (order_events)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de eventos de órdenes
CREATE TABLE IF NOT EXISTS order_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_external_id TEXT        NOT NULL,  -- order_id legible para mostrar en UI
  channel           TEXT        NOT NULL,
  event_type        TEXT        NOT NULL CHECK (event_type IN (
    'order_created', 'status_changed', 'remision_assigned', 'halcon_assigned'
  )),
  old_value         TEXT,
  new_value         TEXT,
  description       TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id   ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at DESC);

-- RLS permisivo (igual que orders, MVP)
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to order_events"
  ON order_events FOR ALL USING (true);

-- ============================================
-- FUNCIÓN: fn_orders_activity_event
-- Inserta un evento en order_events cuando una
-- orden es creada o se actualizan campos clave.
-- ============================================

CREATE OR REPLACE FUNCTION fn_orders_activity_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_events
      (order_id, order_external_id, channel, event_type, new_value, description)
    VALUES (
      NEW.id, NEW.order_id, NEW.channel,
      'order_created',
      NEW.status,
      'Pedido creado · estado ' || NEW.status
    );

  ELSIF TG_OP = 'UPDATE' THEN

    -- Cambio de estado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO order_events
        (order_id, order_external_id, channel, event_type, old_value, new_value, description)
      VALUES (
        NEW.id, NEW.order_id, NEW.channel,
        'status_changed',
        OLD.status, NEW.status,
        'Estado: ' || OLD.status || ' → ' || NEW.status
      );
    END IF;

    -- Remisión TBC asignada (primera vez)
    IF OLD.remision_tbc IS NULL AND NEW.remision_tbc IS NOT NULL THEN
      INSERT INTO order_events
        (order_id, order_external_id, channel, event_type, new_value, description)
      VALUES (
        NEW.id, NEW.order_id, NEW.channel,
        'remision_assigned',
        NEW.remision_tbc,
        'Remisión TBC: ' || NEW.remision_tbc
      );
    END IF;

    -- Serial Halcón asignado (primera vez)
    IF OLD.halcon_serial IS NULL AND NEW.halcon_serial IS NOT NULL THEN
      INSERT INTO order_events
        (order_id, order_external_id, channel, event_type, new_value, description)
      VALUES (
        NEW.id, NEW.order_id, NEW.channel,
        'halcon_assigned',
        NEW.halcon_serial::TEXT,
        'Serial Halcón: ' || NEW.halcon_serial::TEXT
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Trigger sobre orders
CREATE TRIGGER trg_orders_activity
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_orders_activity_event();

-- Habilitar Supabase Realtime para order_events
-- La publicación supabase_realtime ya existe en todo proyecto Supabase.
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;
