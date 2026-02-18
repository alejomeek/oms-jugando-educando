import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea un monto en formato de moneda
 * @param amount - Monto a formatear
 * @param currency - Código de moneda (COP, USD, etc.)
 * @returns String formateado como moneda
 *
 * @example
 * formatCurrency(59900, 'COP') // "$59.900"
 * formatCurrency(1500.50, 'USD') // "$1,500.50"
 */
export function formatCurrency(amount: number, currency: string = 'COP'): string {
  // Mapeo de códigos de moneda a símbolos
  const currencySymbols: Record<string, string> = {
    COP: '$',
    USD: '$',
    MXN: '$',
    ARS: '$',
    BRL: 'R$',
    CLP: '$',
    PEN: 'S/',
    UYU: '$U',
  };

  const symbol = currencySymbols[currency] || currency;

  // Para COP (pesos colombianos), no mostrar decimales
  if (currency === 'COP') {
    return `${symbol}${amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  // Para otras monedas, mostrar 2 decimales
  return `${symbol}${amount.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formatea una fecha en formato legible en español
 * @param date - String de fecha ISO o Date object
 * @param formatStr - Formato de salida (default: 'dd/MM/yyyy HH:mm')
 * @returns String formateado de fecha
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z') // "15/01/2024 10:30"
 * formatDate('2024-01-15T10:30:00Z', 'dd MMM yyyy') // "15 ene 2024"
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Fecha inválida';
  }
}
