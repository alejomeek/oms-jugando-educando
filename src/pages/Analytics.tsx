import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ORDER_STATUSES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type DateRangeKey = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
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

const CHANNEL_COLORS = { mercadolibre: '#FFE600', wix: '#00A9E0' };
const STATUS_COLORS: Record<string, string> = {
  nuevo: '#3B82F6',
  preparando: '#EAB308',
  listo: '#22C55E',
  enviado: '#6B7280',
  cancelado: '#EF4444',
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function Analytics() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('30d');
  const dateRange = useMemo(() => getDateRange(rangeKey), [rangeKey]);
  const { data, isLoading, error } = useAnalytics(dateRange);

  const channelChartData = useMemo(() => {
    if (!data) return [];
    return data.byChannel.map(c => ({
      name: c.channel === 'mercadolibre' ? 'Mercado Libre' : 'Wix',
      pedidos: c.orderCount,
      ingresos: c.totalRevenue,
      fill: CHANNEL_COLORS[c.channel],
    }));
  }, [data]);

  const statusChartData = useMemo(() => {
    if (!data) return [];
    return data.byStatus.map(s => ({
      name: ORDER_STATUSES[s.status as keyof typeof ORDER_STATUSES]?.label || s.status,
      count: s.count,
      fill: STATUS_COLORS[s.status] || '#9CA3AF',
    }));
  }, [data]);

  const mlStats = data?.byChannel.find(c => c.channel === 'mercadolibre');
  const wixStats = data?.byChannel.find(c => c.channel === 'wix');

  return (
    <>
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Gestion de Pedidos</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="font-medium">Analiticas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {DATE_RANGE_OPTIONS.map(opt => (
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
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="font-medium text-destructive">Error al cargar analiticas</p>
            <p className="mt-1 text-sm text-destructive/80">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard title="Total Pedidos" value={String(data.totalOrders)} />
              <SummaryCard title="Ingresos Totales" value={formatCOP(data.totalRevenue)} />
              <SummaryCard
                title="Pedidos ML"
                value={String(mlStats?.orderCount || 0)}
                subtitle={formatCOP(mlStats?.totalRevenue || 0)}
                accentColor="#FFE600"
              />
              <SummaryCard
                title="Pedidos Wix"
                value={String(wixStats?.orderCount || 0)}
                subtitle={formatCOP(wixStats?.totalRevenue || 0)}
                accentColor="#00A9E0"
              />
            </div>

            {/* Charts Row 1 */}
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
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {channelChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip />
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
                      <Tooltip formatter={(value) => formatCOP(Number(value))} />
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

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.recentDays}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(d) => `Fecha: ${d}`}
                        formatter={(value) => [`${value} pedidos`, 'Pedidos']}
                      />
                      <Area type="monotone" dataKey="orderCount" name="Pedidos" stroke="#3B82F6" fill="#93C5FD" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.recentWeeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(d) => `Semana del ${d}`}
                        formatter={(value) => [`${value} pedidos`, 'Pedidos']}
                      />
                      <Bar dataKey="orderCount" name="Pedidos" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Status breakdown */}
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
          </>
        )}
      </div>
    </>
  );
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
