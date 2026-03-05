import { useState } from 'react';
import { ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useOperatorOrders } from '@/hooks/useOperatorOrders';
import type { Order } from '@/lib/types';

interface OperatorCardProps {
  label: string;
  orders: Order[];
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
                order.customer?.nickname ||
                (order.customer?.firstName
                  ? `${order.customer.firstName} ${order.customer.lastName ?? ''}`.trim()
                  : order.customer?.email) ||
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
                      <p className="text-xs text-muted-foreground">
                        {order.shipping_address?.city ?? '—'} · #{String(order.order_id).slice(-8)}
                      </p>
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
  const { data, isLoading } = useOperatorOrders();

  if (isLoading) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const sanchez = data?.sanchez ?? [];
  const gggo = data?.gggo ?? [];
  const colecta = data?.colecta ?? [];

  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
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
  );
}
