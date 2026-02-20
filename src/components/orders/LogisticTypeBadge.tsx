import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LOGISTIC_CONFIG: Record<string, { label: string; className: string }> = {
  fulfillment: {
    label: 'Full',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  self_service: {
    label: 'Flex',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cross_docking: {
    label: 'Colecta',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

export interface LogisticTypeBadgeProps {
  logisticType?: string | null;
  className?: string;
}

export function LogisticTypeBadge({ logisticType, className }: LogisticTypeBadgeProps) {
  if (!logisticType) return null;
  const config = LOGISTIC_CONFIG[logisticType];
  if (!config) return null;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
