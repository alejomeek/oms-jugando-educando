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
} from 'lucide-react';
import { useAllOrders } from '@/hooks/useAllOrders';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  listo: '#22C55E',
  enviado: '#6B7280',
  cancelado: '#EF4444',
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

  const { data: orders = [], isLoading, error } = useAllOrders();
  const analytics = useAnalytics(orders, dateRange);

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
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  rangeKey === opt.key
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
                  {analytics.keyInsights.map((insight, i) => (
                    <Card key={i} className="min-w-[180px] max-w-[220px] shrink-0">
                      <CardContent className="pt-3 pb-3">
                        <p className="text-xs text-muted-foreground">{insight.label}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <p
                            className={`text-lg font-bold ${
                              insight.trend === 'up'
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
                      </CardContent>
                    </Card>
                  ))}
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

            {/* Row 6: Estado de Pedidos + Distribución Geográfica */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Estado de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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

              <Card>
                <CardHeader>
                  <CardTitle>Distribución Geográfica</CardTitle>
                </CardHeader>
                <CardContent>
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
                        <TableRow key={i}>
                          <TableCell className="font-medium">{geo.city || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {geo.state || '—'}
                          </TableCell>
                          <TableCell className="text-right">{geo.orderCount}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCOP(geo.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {analytics.geoStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Sin datos geográficos
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
    </>
  );
}
