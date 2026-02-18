import { Badge } from '@/components/ui/badge';

export interface PackIndicatorProps {
  packId?: string | null;
}

export function PackIndicator({ packId }: PackIndicatorProps) {
  if (!packId) return null;

  return (
    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
      Pack
    </Badge>
  );
}
