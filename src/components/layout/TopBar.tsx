import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  onSyncML?: () => void;
  onSyncWix?: () => void;
  onSyncFalabella?: () => void;
  isSyncingML?: boolean;
  isSyncingWix?: boolean;
  isSyncingFalabella?: boolean;
}

export function TopBar({
  title,
  subtitle,
  onSyncML,
  onSyncWix,
  onSyncFalabella,
  isSyncingML = false,
  isSyncingWix = false,
  isSyncingFalabella = false,
}: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{subtitle}</span>
        {subtitle && <Separator orientation="vertical" className="h-4" />}
        <span className="font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Auto-sync status placeholder for Agent 2 */}
        <div id="auto-sync-status" />

        <Button
          size="sm"
          onClick={onSyncML}
          disabled={isSyncingML}
        >
          <RefreshCw className={isSyncingML ? 'animate-spin' : ''} />
          Sincronizar ML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncWix}
          disabled={isSyncingWix}
        >
          <RefreshCw className={isSyncingWix ? 'animate-spin' : ''} />
          Sincronizar Wix
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncFalabella}
          disabled={isSyncingFalabella}
        >
          <RefreshCw className={isSyncingFalabella ? 'animate-spin' : ''} />
          Sincronizar Falabella
        </Button>
      </div>
    </header>
  );
}
