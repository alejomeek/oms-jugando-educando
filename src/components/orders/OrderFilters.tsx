import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const handleClearFilters = () => {
    onFiltersChange({ search: '', status: null, channel: null });
  };

  const hasActiveFilters = filters.search || filters.status || filters.channel;

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

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="size-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
