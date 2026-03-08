import { useState } from 'react';
import { ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useOperatorOrders, type Sede } from '@/hooks/useOperatorOrders';
import type { Order } from '@/lib/types';

// ── Utilidades de fecha ───────────────────────────────────────────────────

function getTodayBogota(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().split('T')[0];
}

const bogotaDateStr = (d: Date) =>
  new Date(d.getTime() - 5 * 3600 * 1000).toISOString().split('T')[0];

/** Formatea order_date en fecha y hora colombiana */
function formatBogotaTime(dateStr: string): string {
  const d = new Date(dateStr);
  const bogota = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const get = (type: string) => bogota.find(p => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}

/** Etiqueta corta para una fecha YYYY-MM-DD: "Hoy", "Lun 9", "Mar 10"... */
function cutoffDateLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Hoy';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', timeZone: 'America/Bogota',
  });
}

// ── Tipos compartidos ─────────────────────────────────────────────────────

interface ColorClasses {
  border: string;
  bg: string;
  text: string;
  divider: string;
  rowHover: string;
  dot: string;
  activePill: string;
}

// ── OrderRow ──────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  colorClasses: ColorClasses;
  onOrderClick: (o: Order) => void;
}

function OrderRow({ order, colorClasses, onOrderClick }: OrderRowProps) {
  const name =
    order.shipping_address?.receiverName ||
    order.customer?.nickname ||
    'Sin nombre';
  return (
    <button
      className={`w-full text-left px-4 py-2.5 border-b last:border-b-0 ${colorClasses.divider} ${colorClasses.rowHover} transition-colors`}
      onClick={() => onOrderClick(order)}
    >
      <div className="min-w-0 w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
            {formatBogotaTime(order.order_date)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`rounded px-1 py-0 text-[10px] font-medium shrink-0
            ${order.channel === 'wix' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {order.channel === 'wix' ? 'Wix' : 'Meli'}
          </span>
          <span className={`rounded px-1 py-0 text-[10px] font-medium shrink-0
            ${order.status === 'nuevo'      ? 'bg-blue-50 text-blue-700'
            : order.status === 'preparando' ? 'bg-yellow-50 text-yellow-700'
            : order.status === 'enviado'    ? 'bg-gray-100 text-gray-500'
            : order.status === 'entregado'  ? 'bg-green-50 text-green-700'
            : 'bg-gray-100 text-gray-400'}`}>
            {order.status === 'preparando' ? 'Prep.'
              : order.status === 'enviado'   ? 'Enviado'
              : order.status === 'entregado' ? 'Entregado'
              : 'Nuevo'}
          </span>
          <p className="text-xs text-muted-foreground truncate">#{order.order_id}</p>
        </div>
      </div>
    </button>
  );
}

// ── DatePickerCard ────────────────────────────────────────────────────────

interface DatePickerCardProps {
  label: string;
  /** Todos los pedidos (hoy + próximos) combinados */
  orders: Order[];
  colorClasses: ColorClasses;
  onOrderClick: (order: Order) => void;
}

function DatePickerCard({ label, orders, colorClasses, onOrderClick }: DatePickerCardProps) {
  const [expanded,     setExpanded]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getTodayBogota());

  const today = getTodayBogota();

  // Fechas disponibles derivadas de los cutoffs de los pedidos
  const availDates = [...new Set(
    orders.map(o => o.cutoff ? bogotaDateStr(new Date(o.cutoff)) : today)
  )].sort();
  const activeDate = availDates.includes(selectedDate) ? selectedDate : (availDates[0] ?? today);

  const visibleOrders = orders.filter(o => {
    const d = o.cutoff ? bogotaDateStr(new Date(o.cutoff)) : today;
    return d === activeDate;
  });

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
          <span className={`text-sm font-medium ${colorClasses.text}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${colorClasses.text}`}>{visibleOrders.length}</span>
          {expanded
            ? <ChevronUp   className={`size-4 ${colorClasses.text}`} />
            : <ChevronDown className={`size-4 ${colorClasses.text}`} />}
        </div>
      </button>

      {/* Tabs de fecha (siempre visibles) */}
      {availDates.length > 0 && (
        <div className={`flex gap-1.5 px-4 py-2 flex-wrap border-t ${colorClasses.divider}`}>
          {availDates.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors font-medium ${
                activeDate === d
                  ? colorClasses.activePill
                  : `bg-white/80 ${colorClasses.text} ${colorClasses.border} hover:bg-white`
              }`}
            >
              {cutoffDateLabel(d, today)}
            </button>
          ))}
        </div>
      )}

      {/* Lista de pedidos (expandible) */}
      {expanded && (
        <div className={`border-t ${colorClasses.divider}`}>
          {visibleOrders.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground text-center">
              Sin pedidos para esta fecha
            </p>
          ) : (
            visibleOrders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                colorClasses={colorClasses}
                onOrderClick={onOrderClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Color presets ─────────────────────────────────────────────────────────

const COLORS = {
  sanchez:    { border: 'border-violet-200', bg: 'bg-violet-50',  text: 'text-violet-700',  divider: 'border-violet-100',  rowHover: 'hover:bg-violet-100/60',  dot: 'bg-violet-500',  activePill: 'bg-violet-500 text-white border-violet-500' },
  gggo:       { border: 'border-orange-200', bg: 'bg-orange-50',  text: 'text-orange-700',  divider: 'border-orange-100',  rowHover: 'hover:bg-orange-100/60',  dot: 'bg-orange-500',  activePill: 'bg-orange-500 text-white border-orange-500' },
  juan:       { border: 'border-blue-200',   bg: 'bg-blue-50',    text: 'text-blue-700',    divider: 'border-blue-100',    rowHover: 'hover:bg-blue-100/60',    dot: 'bg-blue-500',    activePill: 'bg-blue-500 text-white border-blue-500'   },
  unassigned: { border: 'border-gray-200',   bg: 'bg-gray-50',    text: 'text-gray-600',    divider: 'border-gray-100',    rowHover: 'hover:bg-gray-100/60',    dot: 'bg-gray-400',    activePill: 'bg-gray-500 text-white border-gray-500'   },
  colecta:    { border: 'border-amber-200',  bg: 'bg-amber-50',   text: 'text-amber-700',   divider: 'border-amber-100',   rowHover: 'hover:bg-amber-100/60',   dot: 'bg-amber-500',   activePill: 'bg-amber-500 text-white border-amber-500' },
};

// ── OperatorDeliveryCards ─────────────────────────────────────────────────

interface OperatorDeliveryCardsProps {
  sede: Sede;
  onOrderClick: (order: Order) => void;
}

export function OperatorDeliveryCards({ sede, onOrderClick }: OperatorDeliveryCardsProps) {
  const { data, isLoading } = useOperatorOrders(sede);

  const sanchez            = data?.sanchez            ?? [];
  const gggo               = data?.gggo               ?? [];
  const sanchezUpcoming    = data?.sanchezUpcoming    ?? [];
  const gggoUpcoming       = data?.gggoUpcoming       ?? [];
  const juanUpcoming       = data?.juanUpcoming       ?? [];
  const unassignedUpcoming = data?.unassignedUpcoming ?? [];
  const colecta            = data?.colecta            ?? [];
  const juan               = data?.juan               ?? [];
  const unassigned         = data?.unassigned         ?? [];

  if (isLoading) {
    const cols  = sede === 'bulevar' ? 3 : sede === 'medellin' ? 2 : 1;
    const count = sede === 'bulevar' ? 3 : sede === 'medellin' ? 4 : 1;
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  // ── Bulevar ───────────────────────────────────────────────────────────────
  if (sede === 'bulevar') {
    return (
      <div className="grid grid-cols-3 gap-3 items-start">
        <DatePickerCard
          label="Sánchez"
          orders={[...sanchez, ...sanchezUpcoming]}
          colorClasses={COLORS.sanchez}
          onOrderClick={onOrderClick}
        />
        <DatePickerCard
          label="GG Go"
          orders={[...gggo, ...gggoUpcoming]}
          colorClasses={COLORS.gggo}
          onOrderClick={onOrderClick}
        />
        <DatePickerCard
          label="Colecta"
          orders={colecta}
          colorClasses={COLORS.colecta}
          onOrderClick={onOrderClick}
        />
      </div>
    );
  }

  // ── CEDI ──────────────────────────────────────────────────────────────────
  if (sede === 'cedi') {
    return (
      <div className="grid grid-cols-1 gap-3">
        <DatePickerCard
          label="Colecta"
          orders={colecta}
          colorClasses={COLORS.colecta}
          onOrderClick={onOrderClick}
        />
      </div>
    );
  }

  // ── Medellín ──────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 gap-3 items-start">
      <DatePickerCard label="Colecta"     orders={colecta}                                 colorClasses={COLORS.colecta}    onOrderClick={onOrderClick} />
      <DatePickerCard label="GG Go"       orders={[...gggo, ...gggoUpcoming]}              colorClasses={COLORS.gggo}       onOrderClick={onOrderClick} />
      <DatePickerCard label="Juan"        orders={[...juan, ...juanUpcoming]}              colorClasses={COLORS.juan}       onOrderClick={onOrderClick} />
      <DatePickerCard label="Sin asignar" orders={[...unassigned, ...unassignedUpcoming]}  colorClasses={COLORS.unassigned} onOrderClick={onOrderClick} />
    </div>
  );
}
