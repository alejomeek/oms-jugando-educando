import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '@/pages/Dashboard';

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evitar refetch al cambiar de tab
      retry: 1, // Solo 1 retry en caso de error
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

/**
 * Componente principal de la aplicación OMS
 * Configura React Query y renderiza el Dashboard
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
