import { useState, useMemo } from 'react';
import { Eye, Users, ArrowUp, ArrowDown, ArrowUpDown, Crown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { CustomerProfile } from '@/hooks/useCustomers';

interface CustomerTableProps {
  customers: CustomerProfile[];
  onSelectCustomer: (customer: CustomerProfile) => void;
  isLoading?: boolean;
}

type SortField = 'orderCount' | 'ltv' | 'avgTicket' | 'lastOrderDate';
type SortDir = 'asc' | 'desc';
type ChannelFilter = 'all' | 'mercadolibre' | 'wix' | 'falabella';

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'desc' ? (
            <ArrowDown className="size-3.5 text-primary" />
          ) : (
            <ArrowUp className="size-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  );
}

function ChannelBadge({ channel }: { channel: 'mercadolibre' | 'wix' | 'falabella' }) {
  if (channel === 'mercadolibre') {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">Meli</Badge>;
  }
  if (channel === 'falabella') {
    return (
      <Badge className="hover:opacity-90" style={{ backgroundColor: 'rgba(170,214,62,0.18)', color: '#5a7a00', borderColor: '#aad63e' }}>
        Fal
      </Badge>
    );
  }
  return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200">Wix</Badge>;
}

export function CustomerTable({
  customers,
  onSelectCustomer,
  isLoading = false,
}: CustomerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('ltv');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [vipOnly, setVipOnly] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = customers;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.nickname?.toLowerCase().includes(q) ?? false)
      );
    }

    if (channelFilter !== 'all') {
      result = result.filter((c) => c.channel === channelFilter);
    }

    if (vipOnly) {
      result = result.filter((c) => c.isVip);
    }

    result = [...result].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'lastOrderDate') {
        aVal = a.lastOrderDate;
        bVal = b.lastOrderDate;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (typeof aVal === 'string') {
        return sortDir === 'desc'
          ? bVal.toString().localeCompare(aVal)
          : aVal.localeCompare(bVal.toString());
      }

      return sortDir === 'desc'
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });

    return result;
  }, [customers, search, channelFilter, vipOnly, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>LTV</TableHead>
              <TableHead>Ticket Prom.</TableHead>
              <TableHead>Último Pedido</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar cliente, email, nickname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />

        <div className="flex rounded-lg border bg-muted p-0.5">
          {(['all', 'mercadolibre', 'wix', 'falabella'] as ChannelFilter[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                channelFilter === ch
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {ch === 'all' ? 'Todos' : ch === 'mercadolibre' ? 'Mercado Libre' : ch === 'wix' ? 'Wix' : 'Falabella'}
            </button>
          ))}
        </div>

        <Button
          variant={vipOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVipOnly((v) => !v)}
          className="h-9 gap-1"
        >
          <Crown className="size-3.5" />
          Solo VIP
        </Button>

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredAndSorted.length} clientes
        </span>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="mb-3 size-12 text-muted-foreground/40" />
          <p className="text-base font-medium">No se encontraron clientes</p>
          <p className="mt-1 text-sm">Intenta ajustar los filtros de búsqueda</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <SortHeader
                label="Pedidos"
                field="orderCount"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="LTV"
                field="ltv"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Ticket Prom."
                field="avgTicket"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Último Pedido"
                field="lastOrderDate"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead>Segmento</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((customer) => (
              <TableRow
                key={customer.key}
                className="cursor-pointer"
                onClick={() => onSelectCustomer(customer)}
              >
                <TableCell className="max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {customer.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-medium">{customer.displayName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <ChannelBadge channel={customer.channel} />
                </TableCell>
                <TableCell className="text-center font-medium">
                  {customer.orderCount}
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {formatCurrency(customer.ltv, 'COP')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(customer.avgTicket, 'COP')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(customer.lastOrderDate, 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {customer.isVip && (
                      <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                        <Crown className="size-2.5" />
                        VIP
                      </Badge>
                    )}
                    {customer.isRepeat && !customer.isVip && (
                      <Badge variant="secondary">Recurrente</Badge>
                    )}
                    {!customer.isRepeat && !customer.isVip && (
                      <span className="text-xs text-muted-foreground">Nuevo</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCustomer(customer);
                    }}
                  >
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
