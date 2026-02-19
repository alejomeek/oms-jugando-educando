import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerProfile } from '@/hooks/useCustomers';

interface CrmExportButtonProps {
  customers: CustomerProfile[];
}

export function CrmExportButton({ customers }: CrmExportButtonProps) {
  const handleExport = () => {
    const headers = [
      'Nombre',
      'Canal',
      'Email',
      'Teléfono',
      'Pedidos',
      'LTV',
      'Ticket Promedio',
      'Primer Pedido',
      'Último Pedido',
      'VIP',
      'Recurrente',
      'Ciudad',
      'Producto Favorito',
    ];

    const rows = customers.map((c) => [
      c.displayName,
      c.channel,
      c.email ?? '',
      c.phone ?? '',
      String(c.orderCount),
      String(c.ltv),
      String(c.avgTicket),
      c.firstOrderDate,
      c.lastOrderDate,
      c.isVip ? 'Sí' : 'No',
      c.isRepeat ? 'Sí' : 'No',
      c.preferredCity ?? '',
      c.mostPurchasedProduct ?? '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-4" />
      Exportar CSV
    </Button>
  );
}
