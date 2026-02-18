import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { OrderStatus, OrderChannel } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();

  const handleNavigate = (view: string) => {
    if (view === 'analytics') {
      navigate('/analytics');
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
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
