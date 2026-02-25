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
    className: 'bg-[rgba(170,214,62,0.18)] text-[#5a7a00] border-[#aad63e]',
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
