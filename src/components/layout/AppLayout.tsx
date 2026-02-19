import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { OrderStatus, OrderChannel } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

function useActiveView(): string {
  const location = useLocation();
  if (location.pathname.startsWith('/analytics')) return 'analytics';
  if (location.pathname.startsWith('/crm')) return 'crm';
  return 'dashboard';
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const activeView = useActiveView();

  const handleNavigate = (view: string) => {
    if (view === 'analytics') {
      navigate('/analytics');
    } else if (view === 'crm') {
      navigate('/crm');
    } else {
      navigate('/');
    }
  };

  const handleFilterStatus = (_status: OrderStatus | null) => {
    // Sidebar status filter navigates to dashboard — filtering is handled by Dashboard state
    navigate('/');
  };

  const handleFilterChannel = (_channel: OrderChannel | null) => {
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onNavigate={handleNavigate}
        onFilterStatus={handleFilterStatus}
        onFilterChannel={handleFilterChannel}
        activeView={activeView}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
