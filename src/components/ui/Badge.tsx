export interface BadgeProps {
  color: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge con colores dinámicos
 *
 * @example
 * <Badge color="blue">Nuevo</Badge>
 * <Badge color="yellow">Preparando</Badge>
 */
export function Badge({ color, children, className = '' }: BadgeProps) {
  // Mapeo de colores a clases de Tailwind
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const colorClass = colorClasses[color] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
}
