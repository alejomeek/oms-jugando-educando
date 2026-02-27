import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useOrderStats } from '@/hooks/useOrderStats';
import { useSyncML } from '@/hooks/useSyncML';
import { useSyncWix } from '@/hooks/useSyncWix';
import { useSyncFalabella } from '@/hooks/useSyncFalabella';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAutoSyncSettings } from '@/hooks/useAutoSyncSettings';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStats } from '@/components/orders/OrderStats';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import type { Order, OrderFilters as OrderFiltersType, OrderStatus } from '@/lib/types';

export function Dashboard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: null,
    channel: null,
  });

  // Reset page when filters change
  const handleFiltersChange = (newFilters: OrderFiltersType) => {
    setFilters(newFilters);
    setPage(1);
  };

  // Fetch paginated orders
  const { data: ordersData, isLoading, error } = useOrders({ ...filters, page, pageSize });
  const orders = ordersData?.data || [];
  const totalCount = ordersData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch stats filtered by the active channel/store/status
  const { data: stats, isLoading: isLoadingStats } = useOrderStats({
    channel: filters.channel,
    store: filters.store,
    status: filters.status,
  });

  const { mutate: syncML, isPending: isSyncingML } = useSyncML();
  const { mutate: syncWix, isPending: isSyncingWix } = useSyncWix();
  const { mutate: syncFalabella, isPending: isSyncingFalabella } = useSyncFalabella();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateOrderStatus();

  const { settings: autoSyncSettings, updateSettings: updateAutoSyncSettings } = useAutoSyncSettings();

  const onSyncComplete = useCallback((_channel: 'mercadolibre' | 'wix', newOrderCount: number) => {
    if (newOrderCount > 0) {
      toast.success(`${newOrderCount} nuevos pedidos!`, {
        description: 'Sincronizacion automatica completada',
      });
    }
  }, []);

  const onSyncError = useCallback((_channel: 'mercadolibre' | 'wix', err: Error) => {
    toast.error('Error al sincronizar', { description: err.message });
  }, []);

  useAutoSync({
    enabled: autoSyncSettings.enabled,
    intervalMinutes: autoSyncSettings.intervalMinutes,
    onSyncComplete,
    onSyncError,
  });

  const handleSyncML = () => {
    syncML(undefined, {
      onSuccess: () => toast.success('Sincronizacion ML completada'),
      onError: (err) => toast.error('Error al sincronizar ML', { description: err.message }),
    });
  };

  const handleSyncWix = () => {
    syncWix(undefined, {
      onSuccess: () => toast.success('Sincronizacion Wix completada'),
      onError: (err) => toast.error('Error al sincronizar Wix', { description: err.message }),
    });
  };

  const handleSyncFalabella = () => {
    syncFalabella(undefined, {
      onSuccess: () => toast.success('Sincronizacion Falabella completada'),
      onError: (err) => toast.error('Error al sincronizar Falabella', { description: err.message }),
    });
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateStatus(
      { orderId, newStatus },
      {
        onSuccess: () => {
          toast.success('Estado actualizado exitosamente');
        },
        onError: (error) => {
          toast.error('Error al actualizar estado', { description: error.message });
        },
      }
    );
  };

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Gestion de Pedidos"
        onSyncML={handleSyncML}
        onSyncWix={handleSyncWix}
        isSyncingML={isSyncingML}
        isSyncingWix={isSyncingWix}
        onSyncFalabella={handleSyncFalabella}
        isSyncingFalabella={isSyncingFalabella}
      />

      <div className="space-y-6 p-6">
        {/* Auto-sync settings */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={autoSyncSettings.enabled}
              onChange={(e) => updateAutoSyncSettings({ enabled: e.target.checked })}
              className="size-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="font-medium">Sincronizacion automatica</span>
          </label>
          {autoSyncSettings.enabled && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Cada</span>
              <input
                type="number"
                min={1}
                max={60}
                value={autoSyncSettings.intervalMinutes}
                onChange={(e) => updateAutoSyncSettings({ intervalMinutes: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground">minutos</span>
            </div>
          )}
          {autoSyncSettings.enabled && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <span className="size-2 animate-pulse rounded-full bg-green-500" />
              Auto-sync activo
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="font-medium text-destructive">Error al cargar pedidos</p>
            <p className="mt-1 text-sm text-destructive/80">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        )}

        {/* ── Fila 1: Resumen general + Historial de actividad ───────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Resumen general */}
          <Card className="flex flex-col">
            <CardHeader className="shrink-0 pb-4">
              <CardTitle>Resumen general</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pb-5">
              <OrderStats
                stats={stats || {
                  total: 0,
                  nuevo: 0,
                  preparando: 0,
                  entregado: 0,
                  enviado: 0,
                  mercadolibre: 0,
                  wix: 0,
                  falabella: 0,
                }}
                isLoading={isLoadingStats}
              />
            </CardContent>
          </Card>

          {/* Historial de actividad */}
          <ActivityFeed />
        </div>

        {/* ── Fila 2: Resumen de pedidos ─────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Resumen de pedidos ({totalCount})</CardTitle>
              {isUpdatingStatus && (
                <span className="animate-pulse text-sm text-primary">
                  Actualizando estado...
                </span>
              )}
            </div>
            <div className="pt-3">
              <OrderFilters filters={filters} onFiltersChange={handleFiltersChange} />
            </div>
          </CardHeader>
          <CardContent>
            <OrdersTable
              orders={orders}
              onOrderClick={handleOrderClick}
              isLoading={isLoading}
            />

            {/* Paginación */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Página {page} de {Math.ceil(totalCount / pageSize) || 1}
                <span className="ml-2">({totalCount} pedidos)</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!ordersData || page >= totalPages || isLoading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
      </div>
    </>
  );
}
