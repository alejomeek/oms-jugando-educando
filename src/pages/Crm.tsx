import { useState } from 'react';
import { Users, Repeat, Star, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useAllOrders } from '@/hooks/useAllOrders';
import { useCustomers, type CustomerProfile } from '@/hooks/useCustomers';
import { CustomerTable } from '@/components/crm/CustomerTable';
import { CustomerSheet } from '@/components/crm/CustomerSheet';
import { CrmExportButton } from '@/components/crm/CrmExportButton';

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Crm() {
  const { data: orders = [], isLoading } = useAllOrders();
  const { customers, summary } = useCustomers(orders);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  return (
    <>
      {/* Header */}
      <header className="flex h-14 items-center border-b bg-card px-6">
        <span className="text-muted-foreground text-sm">Gestión de Pedidos</span>
        <Separator orientation="vertical" className="mx-3 h-4" />
        <span className="font-medium">CRM / Clientes</span>
        <div className="ml-auto">
          <CrmExportButton customers={customers} />
        </div>
      </header>

      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Total Clientes"
            value={isLoading ? '—' : String(summary.totalCustomers)}
            color="bg-blue-100 text-blue-600"
          />
          <KpiCard
            icon={Repeat}
            label="Clientes Recurrentes"
            value={isLoading ? '—' : String(summary.repeatCustomers)}
            sub={
              isLoading
                ? undefined
                : `${((summary.repeatCustomers / (summary.totalCustomers || 1)) * 100).toFixed(1)}% del total`
            }
            color="bg-indigo-100 text-indigo-600"
          />
          <KpiCard
            icon={TrendingUp}
            label="Tasa de Retención"
            value={isLoading ? '—' : `${summary.retentionRate.toFixed(1)}%`}
            color="bg-green-100 text-green-600"
          />
          <KpiCard
            icon={Star}
            label="Clientes VIP"
            value={isLoading ? '—' : String(summary.vipCount)}
            sub={
              isLoading
                ? undefined
                : `Top 20% por LTV`
            }
            color="bg-amber-100 text-amber-600"
          />
        </div>

        {/* Customer Table */}
        <Card>
          <CardContent className="pt-4">
            <CustomerTable
              customers={customers}
              onSelectCustomer={setSelectedCustomer}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Customer Detail Sheet */}
      {selectedCustomer && (
        <CustomerSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </>
  );
}
