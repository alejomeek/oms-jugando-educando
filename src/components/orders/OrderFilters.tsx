import { ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ML_STORE_NAMES } from '@/lib/constants';
import type { OrderFilters as OrderFiltersType } from '@/lib/types';

export interface OrderFiltersProps {
  filters: OrderFiltersType;
  onFiltersChange: (filters: OrderFiltersType) => void;
}

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  };

  const handleChannelChange = (channel: string) => {
    onFiltersChange({
      ...filters,
      channel: channel === 'all' ? null : (channel as 'mercadolibre' | 'wix'),
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? null : (status as any),
    });
  };

  const handleStoreToggle = (store: string) => {
    const current = filters.store ?? [];
    const updated = current.includes(store)
      ? current.filter(s => s !== store)
      : [...current, store];
    onFiltersChange({ ...filters, store: updated.length > 0 ? updated : null });
  };

  const storeLabel = () => {
    const selected = filters.store ?? [];
    if (selected.length === 0) return 'Todas las tiendas';
    if (selected.length === 1) return selected[0];
    return `${selected.length} tiendas`;
  };

  const handleSinRemisionToggle = () => {
    onFiltersChange({ ...filters, sinRemision: !filters.sinRemision });
  };

  const handleClearFilters = () => {
    onFiltersChange({ search: '', status: null, channel: null, store: [], sinRemision: false });
  };

  const hasActiveFilters = filters.search || filters.status || filters.channel || (filters.store && filters.store.length > 0) || filters.sinRemision;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="Buscar por ID, cliente, email..."
          className="pl-9"
        />
      </div>

      <Select
        value={filters.channel || 'all'}
        onValueChange={handleChannelChange}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Todos los canales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los canales</SelectItem>
          <SelectItem value="mercadolibre">Mercado Libre</SelectItem>
          <SelectItem value="wix">Wix</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between sm:w-40 font-normal">
            <span className="truncate">{storeLabel()}</span>
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          {ML_STORE_NAMES.map((name) => (
            <DropdownMenuCheckboxItem
              key={name}
              checked={(filters.store ?? []).includes(name)}
              onCheckedChange={() => handleStoreToggle(name)}
            >
              {name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Select
        value={filters.status || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="nuevo">Nuevo</SelectItem>
          <SelectItem value="preparando">Preparando</SelectItem>
          <SelectItem value="enviado">Enviado</SelectItem>
          <SelectItem value="entregado">Entregado</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={filters.sinRemision ? 'default' : 'outline'}
        size="sm"
        onClick={handleSinRemisionToggle}
        className="shrink-0"
      >
        Sin remisión
      </Button>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="size-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
