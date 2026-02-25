import {
  ShoppingCart,
  RefreshCw,
  FileText,
  Hash,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { OrderEvent, OrderEventType } from '@/lib/types';

// ── Configuración visual por tipo de evento ──────────────────────────────────

const EVENT_CONFIG: Record<
  OrderEventType,
  { label: string; icon: React.ElementType; iconBg: string }
> = {
  order_created: {
    label: 'Pedido creado',
    icon: ShoppingCart,
    iconBg: 'bg-blue-100 text-blue-600',
  },
  status_changed: {
    label: 'Estado cambiado',
    icon: RefreshCw,
    iconBg: 'bg-violet-100 text-violet-600',
  },
  remision_assigned: {
    label: 'Remisión TBC',
    icon: FileText,
    iconBg: 'bg-amber-100 text-amber-600',
  },
  halcon_assigned: {
    label: 'Serial Halcón',
    icon: Hash,
    iconBg: 'bg-emerald-100 text-emerald-600',
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

// ── Tiempo relativo ───────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ── Fila de evento ────────────────────────────────────────────────────────────

function EventRow({ event }: { event: OrderEvent }) {
  const config = EVENT_CONFIG[event.event_type];
  const Icon = config.icon;

  return (
    <div className="flex gap-3 border-b py-3 last:border-0">
      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}
      >
        <Icon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-mono text-xs font-semibold">
            #{event.order_external_id}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {relativeTime(event.created_at)}
          </span>
        </div>

        <p className="mt-0.5 text-xs font-medium text-foreground">
          {config.label}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {event.description}
        </p>

        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: CHANNEL_COLORS[event.channel] ?? '#9CA3AF' }}
          />
          <span className="text-[10px] text-muted-foreground">
            {CHANNEL_LABELS[event.channel] ?? event.channel}
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
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-green-500" />
          <CardTitle className="text-base">Historial de actividad</CardTitle>
          {events.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {events.length} eventos
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {isLoading ? (
          /* Skeleton */
          <div className="px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b py-3 last:border-0">
                <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-6 py-12 text-muted-foreground">
            <Inbox className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Sin actividad registrada</p>
            <p className="mt-1 text-center text-xs">
              Los eventos aparecen aquí en tiempo real
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[380px]">
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
