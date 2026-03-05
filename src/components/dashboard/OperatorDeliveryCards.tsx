import { useState } from 'react';
import { ChevronDown, ChevronUp, Truck, MapPin } from 'lucide-react';
import { useOperatorOrders, type Sede } from '@/hooks/useOperatorOrders';
import type { Order } from '@/lib/types';

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">#{order.order_id}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize
                      ${order.status === 'nuevo' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {order.status}
                    </span>
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

interface OperatorDeliveryCardsProps {
  onOrderClick: (order: Order) => void;
}

export function OperatorDeliveryCards({ onOrderClick }: OperatorDeliveryCardsProps) {
  const [sede, setSede] = useState<Sede>(
    () => (localStorage.getItem(SEDE_KEY) as Sede | null) ?? 'bulevar'
  );

  const { data, isLoading } = useOperatorOrders(sede);

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
        <div className="grid grid-cols-3 gap-3">
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
          <OperatorCard
            label="Colecta"
            orders={colecta}
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
          <OperatorCard
            label="Colecta"
            orders={colecta}
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
