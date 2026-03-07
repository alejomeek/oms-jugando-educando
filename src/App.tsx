import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Crm } from '@/pages/Crm';
import { PinGate } from '@/components/ui/PinGate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={100}>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<PinGate label="Analytics"><Analytics /></PinGate>} />
              <Route path="/crm" element={<PinGate label="CRM / Clientes"><Crm /></PinGate>} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
