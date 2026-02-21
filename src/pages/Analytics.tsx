import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Crown,
  Info,
} from 'lucide-react';
import { useAllOrders } from '@/hooks/useAllOrders';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCustomers } from '@/hooks/useCustomers';
import type { CustomerProfile } from '@/hooks/useCustomers';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomerSheet } from '@/components/crm/CustomerSheet';
import { GeoMap } from '@/components/analytics/GeoMap';
import { MLRevenueMap } from '@/components/analytics/MLRevenueMap';
import type { MLCityData } from '@/components/analytics/MLRevenueMap';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DateRangeKey = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: 'all', label: 'Todo' },
];

function getDateRange(key: DateRangeKey): { from: Date; to: Date } | undefined {
  const now = new Date();
  switch (key) {
    case '7d':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case '30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    case '90d':
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now };
    case 'all':
      return undefined;
  }
}

const CHANNEL_COLORS: Record<string, string> = {
  mercadolibre: '#FFE600',
  wix: '#00A9E0',
};

const STATUS_COLORS: Record<string, string> = {
  nuevo: '#3B82F6',
  preparando: '#EAB308',
  enviado: '#6B7280',
  entregado: '#22C55E',
  cancelado: '#EF4444',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  visa: '#1A1F71',
  master: '#EB001B',
  debmaster: '#F79E1B',
  pse: '#00A5A8',
  efecty: '#FF6B00',
};

const PAYMENT_FALLBACK_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#9CA3AF'];

const LOGISTIC_LABELS: Record<string, string> = {
  fulfillment: 'FULL',
  cross_docking: 'Colecta',
  self_service: 'Flex',
};

const LOGISTIC_COLORS: Record<string, string> = {
  fulfillment: '#8B5CF6',
  cross_docking: '#F59E0B',
  self_service: '#10B981',
};

const STORE_COLORS: Record<string, string> = {
  'MEDELLÍN': '#3B82F6',
  'AVENIDA 19': '#EC4899',
  'CEDI': '#14B8A6',
  'BULEVAR': '#F97316',
  'FULL': '#8B5CF6',
};

function formatCOP(value: number): string {
  return formatCurrency(value, 'COP');
}

function SummaryCard({
  title,
  value,
  subtitle,
  accentColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
}) {
  return (
    <Card className="py-4">
      <CardContent>
        {accentColor && (
          <div className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  );
}

// Custom center label for donut chart
function DonutCenterLabel({
  viewBox,
  value,
  label,
}: {
  viewBox?: { cx?: number; cy?: number };
  value: number;
  label: string;
}) {
  const { cx = 0, cy = 0 } = viewBox ?? {};
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.5em" fontSize="22" fontWeight="bold" fill="currentColor">
        {value}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="#6B7280">
        {label}
      </tspan>
    </text>
  );
}

export function Analytics() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('30d');
  const dateRange = useMemo(() => getDateRange(rangeKey), [rangeKey]);

  const [showRepeatCustomers, setShowRepeatCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedCityCoord, setSelectedCityCoord] = useState<[number, number] | null>(null);

  const { data: orders = [], isLoading, error } = useAllOrders();
  const analytics = useAnalytics(orders, dateRange);

  const filteredOrders = useMemo(() => {
    if (!dateRange) return orders;
    return orders.filter(o => {
      const d = new Date(o.order_date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [orders, dateRange]);

  const { customers } = useCustomers(filteredOrders);
  const repeatCustomersList = useMemo(
    () => customers.filter(c => c.isRepeat).sort((a, b) => b.ltv - a.ltv),
    [customers],
  );

  const mlGeoData = useMemo((): MLCityData[] => {
    const mlOrders = filteredOrders.filter(o => o.channel === 'mercadolibre');
    const seenEvents = new Set<string>();

    const cityMap = new Map<string, {
      city: string;
      state: string;
      latSum: number;
      lngSum: number;
      coordCount: number;
      orderCount: number;
      revenue: number;
      products: Map<string, number>;
    }>();

    for (const order of mlOrders) {
      const eventKey = order.pack_id ? `pack:${order.pack_id}` : `order:${order.id}`;
      const isFirst = !seenEvents.has(eventKey);
      if (isFirst) seenEvents.add(eventKey);

      const city = order.shipping_address?.city;
      const state = order.shipping_address?.state ?? '';
      const lat = order.shipping_address?.latitude;
      const lng = order.shipping_address?.longitude;

      if (!city) continue;

      const key = `${city}::${state}`;
      const g = cityMap.get(key) ?? {
        city, state, latSum: 0, lngSum: 0, coordCount: 0,
        orderCount: 0, revenue: 0, products: new Map<string, number>(),
      };

      if (isFirst) g.orderCount++;
      g.revenue += order.total_amount || 0;

      if (lat != null && lng != null) { g.latSum += lat; g.lngSum += lng; g.coordCount++; }

      for (const item of order.items || [])
        g.products.set(item.title, (g.products.get(item.title) ?? 0) + item.quantity);

      cityMap.set(key, g);
    }

    return Array.from(cityMap.values())
      .filter(g => g.coordCount > 0)
      .map(g => ({
        city: g.city, state: g.state,
        lat: g.latSum / g.coordCount, lng: g.lngSum / g.coordCount,
        orderCount: g.orderCount, revenue: g.revenue,
        avgTicket: g.orderCount > 0 ? g.revenue / g.orderCount : 0,
        topProducts: Array.from(g.products.entries())
          .sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([title, qty]) => ({ title, qty })),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const channelChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.byChannel.map((c) => ({
      name: c.channel === 'mercadolibre' ? 'Mercado Libre' : 'Wix',
      pedidos: c.orderCount,
      ingresos: c.totalRevenue,
      fill: CHANNEL_COLORS[c.channel] ?? '#9CA3AF',
    }));
  }, [analytics]);

  const statusChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.byStatus.map((s) => ({
      name: ORDER_STATUSES[s.status as keyof typeof ORDER_STATUSES]?.label ?? s.status,
      count: s.count,
      fill: STATUS_COLORS[s.status] ?? '#9CA3AF',
    }));
  }, [analytics]);

  const topProductsData = useMemo(() => {
    if (!analytics) return [];
    return analytics.topProducts.map((p) => ({
      name: p.title.length > 25 ? p.title.slice(0, 25) + '…' : p.title,
      fullTitle: p.title,
      cantidad: p.totalQuantity,
      ingresos: p.totalRevenue,
    }));
  }, [analytics]);

  const dayOfWeekData = useMemo(() => {
    if (!analytics) return [];
    return analytics.byDayOfWeek;
  }, [analytics]);

  const paymentChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.byPaymentMethod.map((p, i) => ({
      name: p.label,
      value: p.orderCount,
      revenue: p.revenue,
      fill: PAYMENT_METHOD_COLORS[p.method] ?? PAYMENT_FALLBACK_COLORS[i % PAYMENT_FALLBACK_COLORS.length],
    }));
  }, [analytics]);

  // ── Logística ML ────────────────────────────────────────────────────────────
  const logisticsData = useMemo(() => {
    const mlOrders = filteredOrders.filter(o => o.channel === 'mercadolibre');
    const seenEvents = new Set<string>();
    const map = new Map<string, { orderCount: number; revenue: number; statuses: Record<string, number> }>();

    for (const order of mlOrders) {
      const lt = order.logistic_type;
      if (!lt) continue;

      const eventKey = order.pack_id ? `pack:${order.pack_id}` : `order:${order.id}`;
      const isFirst = !seenEvents.has(eventKey);
      if (isFirst) seenEvents.add(eventKey);

      const e = map.get(lt) ?? { orderCount: 0, revenue: 0, statuses: {} };
      if (isFirst) {
        e.orderCount++;
        e.statuses[order.status] = (e.statuses[order.status] || 0) + 1;
      }
      e.revenue += order.total_amount || 0;
      map.set(lt, e);
    }

    return Array.from(map.entries())
      .map(([lt, d]) => ({
        key: lt,
        name: LOGISTIC_LABELS[lt] ?? lt,
        color: LOGISTIC_COLORS[lt] ?? '#9CA3AF',
        orderCount: d.orderCount,
        revenue: d.revenue,
        avgTicket: d.orderCount > 0 ? d.revenue / d.orderCount : 0,
        statuses: d.statuses,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }, [filteredOrders]);

  // Flex vs Colecta por tienda física (excluye FULL que siempre es fulfillment)
  const storeLogisticsData = useMemo(() => {
    const PHYSICAL_STORES = ['MEDELLÍN', 'AVENIDA 19', 'CEDI', 'BULEVAR'];
    const seenEvents = new Set<string>();
    const map = new Map<string, { flex: number; colecta: number }>();

    for (const order of filteredOrders) {
      if (!order.store_name || !PHYSICAL_STORES.includes(order.store_name)) continue;
      const lt = order.logistic_type;
      if (lt !== 'self_service' && lt !== 'cross_docking') continue;

      const eventKey = order.pack_id ? `pack:${order.pack_id}` : `order:${order.id}`;
      const isFirst = !seenEvents.has(eventKey);
      if (isFirst) seenEvents.add(eventKey);
      if (!isFirst) continue;

      const e = map.get(order.store_name) ?? { flex: 0, colecta: 0 };
      if (lt === 'self_service') e.flex++;
      else e.colecta++;
      map.set(order.store_name, e);
    }

    return PHYSICAL_STORES
      .filter(s => map.has(s))
      .map(s => ({
        store: s,
        flex: map.get(s)!.flex,
        colecta: map.get(s)!.colecta,
      }));
  }, [filteredOrders]);

  // ── Tiendas ML ───────────────────────────────────────────────────────────────
  const storeData = useMemo(() => {
    const seenEvents = new Set<string>();
    const map = new Map<string, { orderCount: number; revenue: number; statuses: Record<string, number> }>();

    for (const order of filteredOrders) {
      if (!order.store_name) continue;

      const eventKey = order.pack_id ? `pack:${order.pack_id}` : `order:${order.id}`;
      const isFirst = !seenEvents.has(eventKey);
      if (isFirst) seenEvents.add(eventKey);

      const sn = order.store_name;
      const e = map.get(sn) ?? { orderCount: 0, revenue: 0, statuses: {} };
      if (isFirst) {
        e.orderCount++;
        e.statuses[order.status] = (e.statuses[order.status] || 0) + 1;
      }
      e.revenue += order.total_amount || 0;
      map.set(sn, e);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        color: STORE_COLORS[name] ?? '#9CA3AF',
        orderCount: d.orderCount,
        revenue: d.revenue,
        avgTicket: d.orderCount > 0 ? d.revenue / d.orderCount : 0,
        entregados: d.statuses['entregado'] || 0,
        entregadoPct: d.orderCount > 0 ? Math.round(((d.statuses['entregado'] || 0) / d.orderCount) * 100) : 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }, [filteredOrders]);

  const mlStats = analytics?.byChannel.find((c) => c.channel === 'mercadolibre');
  const wixStats = analytics?.byChannel.find((c) => c.channel === 'wix');

  return (
    <>
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Gestión de Pedidos</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="font-medium">Analíticas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeKey(opt.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${rangeKey === opt.key
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <div className="space-y-6 p-6">
        {isLoading && <LoadingSkeleton />}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="font-medium text-destructive">Error al cargar analíticas</p>
            <p className="mt-1 text-sm text-destructive/80">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        )}

        {!isLoading && analytics && (
          <>
            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total Pedidos"
                value={String(analytics.totalOrders)}
                subtitle={`Ticket promedio: ${formatCOP(analytics.avgOrderValue)}`}
              />
              <SummaryCard
                title="Ingresos Totales"
                value={formatCOP(analytics.totalRevenue)}
              />
              <SummaryCard
                title="Pedidos ML"
                value={String(mlStats?.orderCount ?? 0)}
                subtitle={formatCOP(mlStats?.totalRevenue ?? 0)}
                accentColor="#FFE600"
              />
              <SummaryCard
                title="Pedidos Wix"
                value={String(wixStats?.orderCount ?? 0)}
                subtitle={formatCOP(wixStats?.totalRevenue ?? 0)}
                accentColor="#00A9E0"
              />
            </div>

            {/* Row 2: Key Insights strip */}
            {analytics.keyInsights && analytics.keyInsights.length > 0 && (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {analytics.keyInsights.map((insight, i) => {
                    const isRepeatCard = insight.label === 'Clientes recurrentes';
                    return (
                      <Card
                        key={i}
                        className={`min-w-[180px] max-w-[220px] shrink-0 transition-all${isRepeatCard ? ' cursor-pointer hover:shadow-md hover:border-primary/40' : ''}`}
                        onClick={isRepeatCard ? () => setShowRepeatCustomers(true) : undefined}
                      >
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{insight.label}</span>
                            {insight.tooltip && (
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Info className="size-3.5 cursor-help text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{insight.tooltip}</p>
                                </TooltipContent>
                              </UITooltip>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <p
                              className={`text-lg font-bold ${insight.trend === 'up'
                                ? 'text-green-600'
                                : insight.trend === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                                }`}
                            >
                              {insight.value}
                            </p>
                            {insight.trend === 'up' ? (
                              <TrendingUp className="size-4 text-green-600" />
                            ) : insight.trend === 'down' ? (
                              <TrendingDown className="size-4 text-red-600" />
                            ) : (
                              <Minus className="size-4 text-gray-400" />
                            )}
                          </div>
                          {insight.detail && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
                          )}
                          {isRepeatCard && (
                            <p className="mt-1.5 text-[10px] font-medium text-primary/70">
                              Ver detalle →
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 3: Tendencia de Pedidos + Ingresos por Semana */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics.recentDays}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => d.slice(5)}
                        fontSize={11}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(d) => `Fecha: ${d}`}
                        formatter={(value) => [`${value} pedidos`, 'Pedidos']}
                      />
                      <Area
                        type="monotone"
                        dataKey="orderCount"
                        name="Pedidos"
                        stroke="#3B82F6"
                        fill="#93C5FD"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.recentWeeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => d.slice(5)}
                        fontSize={11}
                      />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        labelFormatter={(d) => `Semana del ${d}`}
                        formatter={(value) => [formatCOP(Number(value)), 'Ingresos']}
                      />
                      <Bar dataKey="revenue" name="Ingresos" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Row 4: Donut Canal + Ingresos por Canal */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelChartData}
                        dataKey="pedidos"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={60}
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {channelChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                        <Label
                          content={(props) => (
                            <DonutCenterLabel
                              viewBox={props.viewBox as { cx?: number; cy?: number }}
                              value={analytics.totalOrders}
                              label="pedidos"
                            />
                          )}
                        />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} pedidos`, 'Pedidos']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => [formatCOP(Number(value)), 'Ingresos']} />
                      <Bar dataKey="ingresos" radius={[4, 4, 0, 0]}>
                        {channelChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Sección: Logística · Mercado Libre ──────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1 w-8 rounded-full bg-yellow-400" />
                <h2 className="text-base font-semibold">Logística · Mercado Libre</h2>
                <span className="text-sm text-muted-foreground">Solo órdenes ML</span>
              </div>

              {/* KPI strip */}
              {logisticsData.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {logisticsData.map(lt => (
                    <div key={lt.key} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                        <span className="text-sm font-semibold">{lt.name}</span>
                      </div>
                      <p className="text-2xl font-bold">{lt.orderCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ticket prom: {formatCOP(lt.avgTicket)}</p>
                      <p className="text-xs text-muted-foreground">{formatCOP(lt.revenue)} ingresos</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos por Modalidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logisticsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={logisticsData}
                            dataKey="orderCount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            innerRadius={60}
                            strokeWidth={2}
                            stroke="#fff"
                          >
                            {logisticsData.map(entry => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                            <Label
                              content={(props) => (
                                <DonutCenterLabel
                                  viewBox={props.viewBox as { cx?: number; cy?: number }}
                                  value={logisticsData.reduce((s, l) => s + l.orderCount, 0)}
                                  label="pedidos ML"
                                />
                              )}
                            />
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} pedidos`, 'Pedidos']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                        Sin datos logísticos
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Flex vs Colecta por Tienda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {storeLogisticsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={storeLogisticsData} margin={{ left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="store" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip formatter={(value, name) => [`${value} pedidos`, name as string]} />
                          <Legend />
                          <Bar dataKey="flex" name="Flex" fill={LOGISTIC_COLORS.self_service} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="colecta" name="Colecta" fill={LOGISTIC_COLORS.cross_docking} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                        Sin datos de tienda
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Sección: Tiendas · Mercado Libre ────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1 w-8 rounded-full bg-yellow-400" />
                <h2 className="text-base font-semibold">Tiendas · Mercado Libre</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos por Tienda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {storeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={storeData} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value} pedidos`, 'Pedidos']} />
                          <Bar dataKey="orderCount" name="Pedidos" radius={[0, 4, 4, 0]}>
                            {storeData.map(entry => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                        Sin datos de tienda
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detalle por Tienda</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">Tienda</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Ticket prom.</TableHead>
                          <TableHead className="text-right pr-6">% Entregados</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storeData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Sin datos de tienda
                            </TableCell>
                          </TableRow>
                        ) : (
                          storeData.map(store => (
                            <TableRow key={store.name}>
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-2">
                                  <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                                  <span className="font-medium text-sm">{store.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{store.orderCount}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formatCOP(store.revenue)}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formatCOP(store.avgTicket)}</TableCell>
                              <TableCell className="text-right pr-6">
                                <span className={`text-sm font-semibold ${
                                  store.entregadoPct >= 70 ? 'text-green-600'
                                  : store.entregadoPct >= 40 ? 'text-amber-600'
                                  : 'text-red-500'
                                }`}>
                                  {store.entregadoPct}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 5: Top Productos + Pedidos por Día de Semana */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topProductsData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={160}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'cantidad'
                            ? `${value} unidades`
                            : formatCOP(Number(value)),
                          name === 'cantidad' ? 'Cantidad' : 'Ingresos',
                        ]}
                        labelFormatter={(label, payload) =>
                          (payload?.[0]?.payload?.fullTitle as string | undefined) ?? label
                        }
                      />
                      <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} name="cantidad" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Día de Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={dayOfWeekData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'avgOrders' ? `${Number(value).toFixed(1)} promedio` : `${value} total`,
                          name === 'avgOrders' ? 'Promedio' : 'Total',
                        ]}
                      />
                      <Bar dataKey="avgOrders" name="avgOrders" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Row 6: Estado de Pedidos */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value) => [`${value} pedidos`, 'Cantidad']} />
                    <Bar dataKey="count" name="Pedidos" radius={[0, 4, 4, 0]}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Row 7: Distribución Geográfica + Mapa de Calor */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Distribución Geográfica</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Depto.</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.geoStats.slice(0, 10).map((geo, i) => (
                        <TableRow
                          key={i}
                          className={geo.lat && geo.lng ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
                          onClick={() => {
                            if (geo.lat && geo.lng) setSelectedCityCoord([geo.lat, geo.lng]);
                          }}
                        >
                          <TableCell className="font-medium text-xs">
                            <span className={geo.lat && geo.lng ? 'text-primary underline decoration-primary/30 underline-offset-2' : ''}>
                              {geo.city || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {geo.state || '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">{geo.orderCount}</TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCOP(geo.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {analytics.geoStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Sin datos geográficos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Mapa de Concentración</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 m-4 mt-0 min-h-[400px]">
                  <GeoMap
                    heatmapData={analytics.heatmapData}
                    topCities={analytics.geoStats}
                    selectedLocation={selectedCityCoord}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Row 8: Mapa de Alcance Mercado Libre */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#FFD600' }} />
                  <CardTitle>Alcance Geográfico · Mercado Libre</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tamaño = pedidos · Color = ingresos (amarillo → naranja) · Top 5 ciudades con anillo pulsante
                </p>
              </CardHeader>
              <CardContent className="p-0 m-4 mt-0 min-h-[420px]">
                <MLRevenueMap cities={mlGeoData} />
              </CardContent>
            </Card>

            {/* Row 9: Métodos de Pago y Tipo de Pago */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={paymentChartData} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} pedidos`, 'Pedidos']} />
                        <Bar dataKey="value" name="Pedidos" radius={[0, 4, 4, 0]}>
                          {paymentChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Sin datos de método de pago
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Pago de contado</p>
                      <p className="mt-1 text-2xl font-bold">{analytics.installmentsInsight.upfront}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {analytics.totalOrders > 0
                          ? `${Math.round((analytics.installmentsInsight.upfront / analytics.totalOrders) * 100)}% del total`
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Pago en cuotas</p>
                      <p className="mt-1 text-2xl font-bold">{analytics.installmentsInsight.financed}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {analytics.totalOrders > 0
                          ? `${Math.round((analytics.installmentsInsight.financed / analytics.totalOrders) * 100)}% del total`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.byPaymentMethod.map((pm, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    PAYMENT_METHOD_COLORS[pm.method] ??
                                    PAYMENT_FALLBACK_COLORS[i % PAYMENT_FALLBACK_COLORS.length],
                                }}
                              />
                              <span className="font-medium">{pm.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{pm.orderCount}</TableCell>
                          <TableCell className="text-right text-sm">{formatCOP(pm.revenue)}</TableCell>
                        </TableRow>
                      ))}
                      {analytics.byPaymentMethod.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Sin datos de pago
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Repeat customers detail sheet */}
      <Sheet open={showRepeatCustomers} onOpenChange={setShowRepeatCustomers}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <SheetTitle>Clientes recurrentes</SheetTitle>
              <Badge variant="secondary" className="ml-1">
                {repeatCustomersList.length}
              </Badge>
            </div>
            <SheetDescription>
              Clientes que compraron más de una vez en el período seleccionado
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="space-y-2 px-4 pb-6 pt-3">
              {repeatCustomersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="mb-2 size-10 text-muted-foreground/40" />
                  <p className="text-sm">Sin clientes recurrentes en este período</p>
                </div>
              ) : (
                repeatCustomersList.map((customer) => (
                  <button
                    key={customer.key}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {customer.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {customer.displayName}
                        </span>
                        {customer.channel === 'mercadolibre' ? (
                          <Badge className="border-yellow-200 bg-yellow-100 px-1 py-0 text-[10px] text-yellow-800 hover:bg-yellow-100">
                            ML
                          </Badge>
                        ) : (
                          <Badge className="border-teal-200 bg-teal-100 px-1 py-0 text-[10px] text-teal-800 hover:bg-teal-100">
                            Wix
                          </Badge>
                        )}
                        {customer.isVip && (
                          <Badge className="gap-0.5 border-amber-200 bg-amber-100 px-1 py-0 text-[10px] text-amber-800 hover:bg-amber-100">
                            <Crown className="size-2.5" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {customer.orderCount} pedidos · {formatCurrency(customer.ltv, 'COP')} LTV
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(customer.lastOrderDate, 'dd MMM')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Individual customer detail */}
      {selectedCustomer && (
        <CustomerSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </>
  );
}
