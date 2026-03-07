import { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface SidebarProps {
  onNavigate?: (view: string) => void;
  activeView?: string;
}

export function Sidebar({
  onNavigate,
  activeView = 'dashboard',
}: SidebarProps) {
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

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="/logo-jye.jpg"
          alt="Logo Jugando y Educando"
          className="size-9 rounded-lg object-contain"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Jugando y</p>
          <p className="text-sm font-semibold">Educando</p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
