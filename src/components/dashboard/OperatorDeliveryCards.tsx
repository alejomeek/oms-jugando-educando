import { useState } from 'react';
import { ChevronDown, ChevronUp, Truck, MapPin } from 'lucide-react';
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

const SEDE_KEY = 'operatorCards_sede';

interface OperatorCardProps {
  label: string;
  orders: Order[];
  fullWidth?: boolean;
  colorClasses: {
    border: string;
    bg: string;
    text: string;
    divider: string;
    rowHover: string;
    dot: string;
  };
  onOrderClick: (order: Order) => void;
}

function OperatorCard({ label, orders, fullWidth, colorClasses, onOrderClick }: OperatorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border ${colorClasses.border} ${colorClasses.bg} overflow-hidden ${fullWidth ? 'col-span-3' : ''}`}>
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
  colorClasses: OperatorCardProps['colorClasses'];
  onOrderClick: (order: Order) => void;
}

function ColectaCard({ orders, slots, slotsLoading, colorClasses, onOrderClick }: ColectaCardProps) {
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

// ─────────────────────────────────────────────────────────────────────────

interface OperatorDeliveryCardsProps {
  onOrderClick: (order: Order) => void;
}

export function OperatorDeliveryCards({ onOrderClick }: OperatorDeliveryCardsProps) {
  const [sede, setSede] = useState<Sede>(
    () => (localStorage.getItem(SEDE_KEY) as Sede | null) ?? 'bulevar'
  );

  const { data, isLoading } = useOperatorOrders(sede);
  const { data: slots = [], isLoading: slotsLoading } = useColectaSchedule();

  const handleSede = (s: Sede) => {
    setSede(s);
    localStorage.setItem(SEDE_KEY, s);
  };

  const sanchez = data?.sanchez ?? [];
  const gggo = data?.gggo ?? [];
  const colecta = data?.colecta ?? [];

  return (
    <div className="mt-4">
      {/* Encabezado con segmented control */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Entregas hoy</p>
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-0.5">
          <button
            onClick={() => handleSede('bulevar')}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors
              ${sede === 'bulevar'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin className="size-3" />
            Bulevar
          </button>
          <button
            onClick={() => handleSede('cedi')}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors
              ${sede === 'cedi'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin className="size-3" />
            CEDI
          </button>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className={`grid gap-3 ${sede === 'bulevar' ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {(sede === 'bulevar' ? [1, 2, 3] : [1]).map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : sede === 'bulevar' ? (
        <div className="grid grid-cols-3 gap-3 items-start">
          <OperatorCard
            label="Sánchez"
            orders={sanchez}
            onOrderClick={onOrderClick}
            colorClasses={{
              border: 'border-violet-200',
              bg: 'bg-violet-50',
              text: 'text-violet-700',
              divider: 'border-violet-100',
              rowHover: 'hover:bg-violet-100/60',
              dot: 'bg-violet-500',
            }}
          />
          <OperatorCard
            label="GG Go"
            orders={gggo}
            onOrderClick={onOrderClick}
            colorClasses={{
              border: 'border-orange-200',
              bg: 'bg-orange-50',
              text: 'text-orange-700',
              divider: 'border-orange-100',
              rowHover: 'hover:bg-orange-100/60',
              dot: 'bg-orange-500',
            }}
          />
          <ColectaCard
            orders={colecta}
            slots={slots}
            slotsLoading={slotsLoading}
            onOrderClick={onOrderClick}
            colorClasses={{
              border: 'border-amber-200',
              bg: 'bg-amber-50',
              text: 'text-amber-700',
              divider: 'border-amber-100',
              rowHover: 'hover:bg-amber-100/60',
              dot: 'bg-amber-500',
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <ColectaCard
            orders={colecta}
            slots={slots}
            slotsLoading={slotsLoading}
            onOrderClick={onOrderClick}
            colorClasses={{
              border: 'border-amber-200',
              bg: 'bg-amber-50',
              text: 'text-amber-700',
              divider: 'border-amber-100',
              rowHover: 'hover:bg-amber-100/60',
              dot: 'bg-amber-500',
            }}
          />
        </div>
      )}
    </div>
  );
}
