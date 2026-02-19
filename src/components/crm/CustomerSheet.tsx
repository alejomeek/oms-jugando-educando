import { Crown, Mail, Phone, MapPin, Package, TrendingUp, Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CrmExportButton } from './CrmExportButton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ORDER_STATUSES } from '@/lib/constants';
import type { CustomerProfile } from '@/hooks/useCustomers';

interface CustomerSheetProps {
  customer: CustomerProfile | null;
  onClose: () => void;
}

function ChannelBadge({ channel }: { channel: 'mercadolibre' | 'wix' }) {
  return channel === 'mercadolibre' ? (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
      Mercado Libre
    </Badge>
  ) : (
    <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200">
      Wix
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };
  const className = colorMap[statusConfig?.color ?? 'gray'] ?? colorMap.gray;
  return (
    <Badge className={`${className} hover:opacity-90`}>
      {statusConfig?.label ?? status}
    </Badge>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
    </div>
  );
}

export function CustomerSheet({ customer, onClose }: CustomerSheetProps) {
  if (!customer) return null;

  const sortedOrders = [...customer.orders].sort(
    (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
  );

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader className="pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {customer.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg leading-none">{customer.displayName}</SheetTitle>
                <ChannelBadge channel={customer.channel} />
                {customer.isVip && (
                  <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                    <Crown className="size-3" />
                    VIP
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Perfil completo del cliente {customer.displayName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-5 px-4 pb-6">
            {/* Contact info */}
            {(customer.email || customer.phone || customer.preferredCity) && (
              <>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contacto
                  </h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="size-3.5 shrink-0" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.preferredCity && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span>{customer.preferredCity}</span>
                      </div>
                    )}
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Stats row */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estadísticas
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <MiniCard label="LTV Total" value={formatCurrency(customer.ltv, 'COP')} />
                <MiniCard label="Pedidos" value={String(customer.orderCount)} />
                <MiniCard label="Ticket Promedio" value={formatCurrency(customer.avgTicket, 'COP')} />
                <MiniCard
                  label="Primer Pedido"
                  value={formatDate(customer.firstOrderDate, 'dd MMM yyyy')}
                />
              </div>
            </section>

            <Separator />

            {/* Retention + favorite product */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {customer.orderCount === 1 ? 'Cliente nuevo' : 'Cliente recurrente'}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {customer.orderCount} {customer.orderCount === 1 ? 'pedido' : 'pedidos'}
                </Badge>
              </div>

              {customer.mostPurchasedProduct && (
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Producto favorito:</span>
                  <span className="text-sm font-medium">{customer.mostPurchasedProduct}</span>
                </div>
              )}
            </section>

            <Separator />

            {/* Order history */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Historial de pedidos
                </h3>
              </div>

              <div className="space-y-2">
                {sortedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">
                          #{order.order_id}
                        </span>
                        {order.channel === 'mercadolibre' ? (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 text-[10px] px-1 py-0">
                            ML
                          </Badge>
                        ) : (
                          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200 text-[10px] px-1 py-0">
                            Wix
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(order.order_date, 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-bold">
                        {formatCurrency(order.total_amount, order.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Export */}
            <div className="flex justify-end">
              <CrmExportButton customers={[customer]} />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
