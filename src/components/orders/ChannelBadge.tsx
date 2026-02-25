import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderChannel } from '@/lib/types';

export interface ChannelBadgeProps {
  channel: OrderChannel;
  className?: string;
}

const channelConfig: Record<OrderChannel, { label: string; className: string }> = {
  mercadolibre: {
    label: 'Mercado Libre',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  wix: {
    label: 'Wix',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  falabella: {
    label: 'Falabella',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const config = channelConfig[channel];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
