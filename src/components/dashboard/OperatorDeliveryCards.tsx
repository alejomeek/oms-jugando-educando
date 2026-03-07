import { useState } from 'react';
import { ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useOperatorOrders, type Sede } from '@/hooks/useOperatorOrders';
import { useColectaSchedule, type ColectaSlot } from '@/hooks/useColectaSchedule';
import type { Order } from '@/lib/types';

// ── Utilidades de Colecta ─────────────────────────────────────────────────

function getTodayBogota(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().split('T')[0];
}

/** Convierte "HH:mm" Bogotá → Date UTC para comparar con order_date */
function cutoffToUTC(cutoff: string): Date {
  const [hh, mm] = cutoff.split(':').map(Number);
  const bogotaToday = new Date(Date.now() - 5 * 3600 * 1000);
  const d = new Date();
  d.setUTCFullYear(bogotaToday.getUTCFullYear(), bogotaToday.getUTCMonth(), bogotaToday.getUTCDate());
  d.setUTCHours(hh + 5, mm, 0, 0); // Bogotá = UTC-5
  return d;
}

/** Formatea order_date en fecha y hora colombiana: DD/MM/AAAA, H:MM a.m./p.m. */
function formatBogotaTime(dateStr: string): string {
  const d = new Date(dateStr);
  const bogota = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);
  const get = (type: string) => bogota.find(p => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}

interface ColorClasses {
  border: string;
  bg: string;
  text: string;
  divider: string;
  rowHover: string;
  dot: string;
}

interface OperatorCardProps {
  label: string;
  orders: Order[];
  colorClasses: ColorClasses;
  onOrderClick: (order: Order) => void;
}

function OperatorCard({ label, orders, colorClasses, onOrderClick }: OperatorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border ${colorClasses.border} ${colorClasses.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${colorClasses.dot}`} />
          <Truck className={`size-4 ${colorClasses.text}`} strokeWidth={1.5} />
          <span className={`text-sm font-medium ${colorClasses.text}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${colorClasses.text}`}>{orders.length}</span>
          {expanded
            ? <ChevronUp className={`size-4 ${colorClasses.text}`} />
            : <ChevronDown className={`size-4 ${colorClasses.text}`} />}
        </div>
      </button>

      {expanded && (
        <div className={`border-t ${colorClasses.divider}`}>
          {orders.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground text-center">Sin pedidos pendientes</p>
          ) : (
            orders.map((order) => {
              const name =
                order.shipping_address?.receiverName ||
                order.customer?.nickname ||
                'Sin nombre';
              return (
                <button
                  key={order.id}
                  className={`w-full text-left px-4 py-2.5 border-b last:border-b-0 ${colorClasses.divider} ${colorClasses.rowHover} transition-colors`}
                  onClick={() => onOrderClick(order)}
                >
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{formatBogotaTime(order.order_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`rounded px-1 py-0 text-[10px] font-medium shrink-0
                        ${order.channel === 'wix' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.channel === 'wix' ? 'Wix' : 'Meli'}
                      </span>
                      <span className={`rounded px-1 py-0 text-[10px] font-medium shrink-0
                        ${order.status === 'nuevo' ? 'bg-blue-50 text-blue-700'
                          : order.status === 'preparando' ? 'bg-yellow-50 text-yellow-700'
                          : order.status === 'enviado' ? 'bg-gray-100 text-gray-500'
                          : order.status === 'entregado' ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'}`}>
                        {order.status === 'preparando' ? 'Prep.'
                          : order.status === 'enviado' ? 'Enviado'
                          : order.status === 'entregado' ? 'Entregado'
                          : 'Nuevo'}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">#{order.order_id}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── ColectaCard ───────────────────────────────────────────────────────────

interface ColectaCardProps {
  orders: Order[];
  slots: ColectaSlot[];
  slotsLoading: boolean;
  colorClasses: ColorClasses;
  onOrderClick: (order: Order) => void;
  weekendNotice?: string;
}

function ColectaCard({ orders, slots, slotsLoading, colorClasses, onOrderClick, weekendNotice }: ColectaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCutoff, setSelectedCutoff] = useState<string | null>(() => {
    return localStorage.getItem(`colecta-cutoff-${getTodayBogota()}`);
  });

  const handleSelect = (cutoff: string) => {
    const key = `colecta-cutoff-${getTodayBogota()}`;
    if (selectedCutoff === cutoff) {
      setSelectedCutoff(null);
      localStorage.removeItem(key);
    } else {
      setSelectedCutoff(cutoff);
      localStorage.setItem(key, cutoff);
    }
  };

  const filteredOrders = selectedCutoff
    ? orders.filter(o => new Date(o.order_date) < cutoffToUTC(selectedCutoff))
    : orders;

  return (
    <div className={`rounded-lg border ${colorClasses.border} ${colorClasses.bg} overflow-hidden`}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${colorClasses.dot}`} />
          <Truck className={`size-4 ${colorClasses.text}`} strokeWidth={1.5} />
          <span className={`text-sm font-medium ${colorClasses.text}`}>Colecta</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${colorClasses.text}`}>{filteredOrders.length}</span>
          {expanded
            ? <ChevronUp className={`size-4 ${colorClasses.text}`} />
            : <ChevronDown className={`size-4 ${colorClasses.text}`} />}
        </div>
      </button>

      {/* Aviso fin de semana — solo CEDI */}
      {weekendNotice && (
        <div className="px-4 pb-2">
          <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-0.5">
            {weekendNotice}
          </span>
        </div>
      )}

      {/* Slot picker */}
      <div className="flex gap-1.5 px-4 pb-3">
        {slotsLoading ? (
          <div className="h-5 w-32 animate-pulse rounded bg-amber-100" />
        ) : slots.length === 0 ? null : (
          slots.map(slot => (
            <button
              key={slot.cutoff}
              onClick={() => handleSelect(slot.cutoff)}
              title={`Pickup: ${slot.from}–${slot.to}`}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors border
                ${selectedCutoff === slot.cutoff
                  ? 'bg-amber-500 text-white border-amber-500'
                  : `bg-white/70 ${colorClasses.text} ${colorClasses.border} hover:bg-amber-100`}`}
            >
              hasta {slot.cutoff}
            </button>
          ))
        )}
      </div>

      {/* Lista de pedidos */}
      {expanded && (
        <div className={`border-t ${colorClasses.divider}`}>
          {filteredOrders.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground text-center">Sin pedidos pendientes</p>
          ) : (
            filteredOrders.map((order) => {
              const name =
                order.shipping_address?.receiverName ||
                order.customer?.nickname ||
                'Sin nombre';
              return (
                <button
                  key={order.id}
                  className={`w-full text-left px-4 py-2.5 border-b last:border-b-0 ${colorClasses.divider} ${colorClasses.rowHover} transition-colors`}
                  onClick={() => onOrderClick(order)}
                >
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{formatBogotaTime(order.order_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="rounded px-1 py-0 text-[10px] font-medium shrink-0 bg-yellow-100 text-yellow-700">
                        Meli
                      </span>
                      <span className={`rounded px-1 py-0 text-[10px] font-medium shrink-0
                        ${order.status === 'nuevo' ? 'bg-blue-50 text-blue-700'
                          : order.status === 'preparando' ? 'bg-yellow-50 text-yellow-700'
                          : order.status === 'enviado' ? 'bg-gray-100 text-gray-500'
                          : order.status === 'entregado' ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'}`}>
                        {order.status === 'preparando' ? 'Prep.'
                          : order.status === 'enviado' ? 'Enviado'
                          : order.status === 'entregado' ? 'Entregado'
                          : 'Nuevo'}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">#{order.order_id}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Retorna el nombre del próximo lunes en Bogotá, p.ej. "Lunes, 9 de marzo de 2026" */
function nextMondayLabel(): string {
  const bogotaDay = new Date(Date.now() - 5 * 3600 * 1000).getUTCDay(); // 0=Dom, 6=Sáb
  const daysToMonday = bogotaDay === 6 ? 2 : 1;
  const monday = new Date();
  monday.setDate(monday.getDate() + daysToMonday);
  const label = monday.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Color presets ─────────────────────────────────────────────────────────

const COLORS = {
  sanchez:    { border: 'border-violet-200', bg: 'bg-violet-50',  text: 'text-violet-700',  divider: 'border-violet-100',  rowHover: 'hover:bg-violet-100/60',  dot: 'bg-violet-500'  },
  gggo:       { border: 'border-orange-200', bg: 'bg-orange-50',  text: 'text-orange-700',  divider: 'border-orange-100',  rowHover: 'hover:bg-orange-100/60',  dot: 'bg-orange-500'  },
  juan:       { border: 'border-blue-200',   bg: 'bg-blue-50',    text: 'text-blue-700',    divider: 'border-blue-100',    rowHover: 'hover:bg-blue-100/60',    dot: 'bg-blue-500'    },
  unassigned: { border: 'border-gray-200',   bg: 'bg-gray-50',    text: 'text-gray-600',    divider: 'border-gray-100',    rowHover: 'hover:bg-gray-100/60',    dot: 'bg-gray-400'    },
  colecta:    { border: 'border-amber-200',  bg: 'bg-amber-50',   text: 'text-amber-700',   divider: 'border-amber-100',   rowHover: 'hover:bg-amber-100/60',   dot: 'bg-amber-500'   },
};

// ─────────────────────────────────────────────────────────────────────────

interface OperatorDeliveryCardsProps {
  sede: Sede;
  onOrderClick: (order: Order) => void;
}

export function OperatorDeliveryCards({ sede, onOrderClick }: OperatorDeliveryCardsProps) {
  const { data, isLoading } = useOperatorOrders(sede);
  const { data: scheduleData, isLoading: slotsLoading } = useColectaSchedule();
  const slots = scheduleData?.slots ?? [];
  const prevCutoffISO = scheduleData?.prevCutoffISO ?? null;

  const sanchez    = data?.sanchez    ?? [];
  const gggo       = data?.gggo       ?? [];
  const colecta    = data?.colecta    ?? [];
  const juan       = data?.juan       ?? [];
  const unassigned = data?.unassigned ?? [];

  if (isLoading) {
    const cols = sede === 'bulevar' ? 3 : sede === 'medellin' ? 2 : 1;
    const count = sede === 'bulevar' ? 3 : sede === 'medellin' ? 4 : 1;
    return (
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  // ── Bulevar ──────────────────────────────────────────────────────────────
  if (sede === 'bulevar') {
    return (
      <div className="grid grid-cols-3 gap-3 items-start">
        <OperatorCard label="Sánchez"   orders={sanchez} colorClasses={COLORS.sanchez}  onOrderClick={onOrderClick} />
        <OperatorCard label="GG Go"     orders={gggo}    colorClasses={COLORS.gggo}     onOrderClick={onOrderClick} />
        <ColectaCard  orders={colecta}  slots={slots}    slotsLoading={slotsLoading}    colorClasses={COLORS.colecta} onOrderClick={onOrderClick} />
      </div>
    );
  }

  // ── CEDI ─────────────────────────────────────────────────────────────────
  if (sede === 'cedi') {
    // Filtrar por hora de corte real del día hábil anterior (datos del schedule ML)
    const cediOrders = prevCutoffISO
      ? colecta.filter(o => new Date(o.order_date) >= new Date(prevCutoffISO))
      : colecta;

    const bogotaDay = new Date(Date.now() - 5 * 3600 * 1000).getUTCDay();
    const isWeekend = bogotaDay === 0 || bogotaDay === 6;
    const weekendNotice = isWeekend ? `Próxima Colecta: ${nextMondayLabel()}` : undefined;
    return (
      <div className="grid grid-cols-1 gap-3">
        <ColectaCard orders={cediOrders} slots={slots} slotsLoading={slotsLoading} colorClasses={COLORS.colecta} onOrderClick={onOrderClick} weekendNotice={weekendNotice} />
      </div>
    );
  }

  // ── Medellín ─────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 gap-3 items-start">
      <OperatorCard label="GG Go"        orders={gggo}       colorClasses={COLORS.gggo}       onOrderClick={onOrderClick} />
      <OperatorCard label="Juan"         orders={juan}       colorClasses={COLORS.juan}        onOrderClick={onOrderClick} />
      <OperatorCard label="Sin asignar"  orders={unassigned} colorClasses={COLORS.unassigned}  onOrderClick={onOrderClick} />
      <ColectaCard  orders={colecta}     slots={slots}       slotsLoading={slotsLoading}       colorClasses={COLORS.colecta} onOrderClick={onOrderClick} />
    </div>
  );
}
