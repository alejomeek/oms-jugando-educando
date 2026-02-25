import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  BarChart3,
  ChevronDown,
  GraduationCap,
  Users,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { OrderStatus, OrderChannel } from '@/lib/types';

export interface SidebarProps {
  onNavigate?: (view: string) => void;
  onFilterStatus?: (status: OrderStatus | null) => void;
  onFilterChannel?: (channel: OrderChannel | null) => void;
  activeView?: string;
}


export function Sidebar({
  onNavigate,
  onFilterStatus,
  onFilterChannel,
  activeView = 'dashboard',
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pedidos: true,
    canales: false,
  });

  const [font, setFont] = useState<'jakarta' | 'satoshi'>(() => {
    try {
      return localStorage.getItem('oms-font') === 'satoshi' ? 'satoshi' : 'jakarta';
    } catch { return 'jakarta'; }
  });

  const toggleFont = () => {
    const next = font === 'jakarta' ? 'satoshi' : 'jakarta';
    setFont(next);
    try {
      if (next === 'satoshi') {
        document.documentElement.classList.add('font-satoshi');
        localStorage.setItem('oms-font', 'satoshi');
      } else {
        document.documentElement.classList.remove('font-satoshi');
        localStorage.setItem('oms-font', 'jakarta');
      }
    } catch { /* noop */ }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Jugando y</p>
          <p className="text-sm font-semibold">Educando</p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard */}
        <Button
          variant={activeView === 'dashboard' ? 'default' : 'ghost'}
          className={cn(
            'w-full justify-start gap-2.5 font-medium',
            activeView === 'dashboard' && 'bg-primary text-primary-foreground'
          )}
          onClick={() => onNavigate?.('dashboard')}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Button>

        {/* Pedidos section */}
        <div className="pt-3">
          <button
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => toggleSection('pedidos')}
          >
            Pedidos
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform',
                expandedSections.pedidos && 'rotate-180'
              )}
            />
          </button>
          {expandedSections.pedidos && (
            <div className="mt-1 space-y-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterStatus?.(null);
                  onNavigate?.('pedidos');
                }}
              >
                <ShoppingCart className="size-4" />
                Todos los pedidos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterStatus?.('nuevo');
                  onNavigate?.('pedidos');
                }}
              >
                <span className="ml-0.5 size-2 rounded-full bg-blue-500" />
                Nuevo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterStatus?.('preparando');
                  onNavigate?.('pedidos');
                }}
              >
                <span className="ml-0.5 size-2 rounded-full bg-amber-500" />
                Preparando
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterStatus?.('enviado');
                  onNavigate?.('pedidos');
                }}
              >
                <span className="ml-0.5 size-2 rounded-full bg-green-500" />
                Enviado
              </Button>
            </div>
          )}
        </div>

        {/* Canales section */}
        <div className="pt-3">
          <button
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => toggleSection('canales')}
          >
            Canales
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform',
                expandedSections.canales && 'rotate-180'
              )}
            />
          </button>
          {expandedSections.canales && (
            <div className="mt-1 space-y-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterChannel?.('mercadolibre');
                  onNavigate?.('pedidos');
                }}
              >
                <Store className="size-4" />
                Mercado Libre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 font-normal"
                onClick={() => {
                  onFilterChannel?.('wix');
                  onNavigate?.('pedidos');
                }}
              >
                <Package className="size-4" />
                Wix
              </Button>
            </div>
          )}
        </div>

        {/* Analytics */}
        <div className="pt-3">
          <Button
            variant={activeView === 'analytics' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2.5 font-medium',
              activeView === 'analytics' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onNavigate?.('analytics')}
          >
            <BarChart3 className="size-4" />
            Analytics
          </Button>
        </div>

        {/* CRM */}
        <div className="pt-1">
          <Button
            variant={activeView === 'crm' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-2.5 font-medium',
              activeView === 'crm' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onNavigate?.('crm')}
          >
            <Users className="size-4" />
            CRM / Clientes
          </Button>
        </div>
      </nav>

      {/* Bottom: sync status + font toggle */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-green-500" />
          Sistema conectado
          <button
            onClick={toggleFont}
            title={font === 'jakarta' ? 'Cambiar a Satoshi' : 'Cambiar a Plus Jakarta Sans'}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            <Type className="size-3" />
            {font === 'satoshi' ? 'Satoshi' : 'Jakarta'}
          </button>
        </div>
      </div>
    </aside>
  );
}
