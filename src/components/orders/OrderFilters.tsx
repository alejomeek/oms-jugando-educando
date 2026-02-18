import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ORDER_STATUSES, CHANNELS } from '@/lib/constants';
import type { OrderFilters } from '@/lib/types';

export interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
}

/**
 * Componente de filtros para órdenes
 * Incluye: búsqueda por texto, filtro por canal, filtro por estado, botón limpiar
 *
 * @example
 * <OrderFilters filters={filters} onFiltersChange={setFilters} />
 */
export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleChannelChange = (channel: string) => {
    onFiltersChange({
      ...filters,
      channel: channel === '' ? null : (channel as 'mercadolibre' | 'wix'),
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === '' ? null : (status as any),
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({ search: '', status: null, channel: null });
  };

  const hasActiveFilters = filters.search || filters.status || filters.channel;

  // Opciones para Select de canal
  const channelOptions = [
    { value: '', label: 'Todos los canales' },
    { value: 'mercadolibre', label: CHANNELS.mercadolibre.label },
    { value: 'wix', label: CHANNELS.wix.label },
  ];

  // Opciones para Select de estado
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'nuevo', label: ORDER_STATUSES.nuevo.label },
    { value: 'preparando', label: ORDER_STATUSES.preparando.label },
    { value: 'listo', label: ORDER_STATUSES.listo.label },
    { value: 'enviado', label: ORDER_STATUSES.enviado.label },
    { value: 'cancelado', label: ORDER_STATUSES.cancelado.label },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <Input
          label="Buscar"
          value={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="ID de orden, cliente, email..."
        />
      </div>

      <div className="w-full md:w-48">
        <Select
          label="Canal"
          value={filters.channel || ''}
          onChange={handleChannelChange}
          options={channelOptions}
        />
      </div>

      <div className="w-full md:w-48">
        <Select
          label="Estado"
          value={filters.status || ''}
          onChange={handleStatusChange}
          options={statusOptions}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex items-end">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
