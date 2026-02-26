import {
  ShoppingCart,
  PackageCheck,
  Truck,
  FileText,
  Hash,
  Inbox,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { OrderEvent, OrderEventType } from '@/lib/types';

// ── Configuración visual por tipo de evento ──────────────────────────────────

type EventConfigKey = OrderEventType | 'order_shipped' | 'order_delivered';

const EVENT_CONFIG: Record<
  EventConfigKey,
  { title: string; icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  order_created: {
    title: 'Pedido creado',
    icon: ShoppingCart,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  status_changed: {
    title: 'Estado actualizado',
    icon: PackageCheck,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  order_shipped: {
    title: 'El pedido está en camino',
    icon: Truck,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  order_delivered: {
    title: 'El pedido fue entregado',
    icon: PackageCheck,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  remision_assigned: {
    title: 'Remisión TBC asignada',
    icon: FileText,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  halcon_assigned: {
    title: 'Serial Halcón asignado',
    icon: Hash,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
};

const CHANNEL_COLORS: Record<string, string> = {
  mercadolibre: '#FFE600',
  wix: '#a855f7',
  falabella: '#aad63e',
};

const CHANNEL_LABELS: Record<string, string> = {
  mercadolibre: 'ML',
  wix: 'Wix',
  falabella: 'Fal',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEffectiveConfigKey(event: OrderEvent): EventConfigKey {
  if (event.event_type === 'status_changed') {
    if (event.new_value === 'enviado') return 'order_shipped';
    if (event.new_value === 'entregado') return 'order_delivered';
  }
  return event.event_type;
}

/** Para ML: muestra pack_id si existe, sino order_external_id. Wix/Falabella: siempre order_external_id. */
function getDisplayId(event: OrderEvent): string {
  if (event.channel === 'mercadolibre') {
    const packId = event.orders?.pack_id;
    if (packId) return `Pack ${packId}`;
  }
  return `#${event.order_external_id}`;
}

/** Formato: "05:02 PM | 26 feb, 2026" */
function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const time = d
    .toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  const date = d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${time} | ${date}`;
}

/** Info adicional para remisión y Halcón (muestra el valor asignado). */
function getSubInfo(event: OrderEvent): string | null {
  if (event.event_type === 'remision_assigned' && event.new_value) {
    return `Remisión: ${event.new_value}`;
  }
  if (event.event_type === 'halcon_assigned' && event.new_value) {
    return `Serial: ${event.new_value}`;
  }
  return null;
}

// ── Fila de evento ────────────────────────────────────────────────────────────

function EventRow({ event }: { event: OrderEvent }) {
  const configKey = getEffectiveConfigKey(event);
  const config = EVENT_CONFIG[configKey];
  const Icon = config.icon;
  const displayId = getDisplayId(event);
  const subInfo = getSubInfo(event);

  return (
    <div className="flex gap-4 border-b py-4 last:border-0">
      {/* Ícono circular */}
      <div
        className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
      >
        <Icon className={`size-5 ${config.iconColor}`} strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Título: "Pack 18745 — El pedido fue entregado" */}
        <p className="text-sm font-semibold leading-snug underline decoration-foreground/25 underline-offset-2">
          <span className="font-mono">{displayId}</span>
          {' — '}
          {config.title}
        </p>

        {/* Valor extra para remisión / halcón */}
        {subInfo && (
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{subInfo}</p>
        )}

        {/* Fila inferior: reloj + fecha + canal */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            <span>{formatEventDate(event.created_at)}</span>
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: CHANNEL_COLORS[event.channel] ?? '#9CA3AF' }}
            />
            <span>{CHANNEL_LABELS[event.channel] ?? event.channel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ActivityFeed() {
  const { events, isLoading } = useActivityFeed();

  return (
    <Card className="flex flex-col">
      <CardHeader className="shrink-0 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Dot verde "live" con efecto ping */}
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
          </span>
          <CardTitle className="text-base">Historial de actividad</CardTitle>
          {events.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{events.length} eventos</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {isLoading ? (
          /* Skeleton */
          <div className="px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-b py-4 last:border-0">
                <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-52 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-6 py-16 text-muted-foreground">
            <Inbox className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Sin actividad registrada</p>
            <p className="mt-1 text-center text-xs">Los eventos aparecen aquí en tiempo real</p>
          </div>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="px-6">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
