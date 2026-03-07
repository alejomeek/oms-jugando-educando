import { useState, useEffect, useCallback } from 'react';
import { Delete, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const PIN = '1503';
const SESSION_KEY = 'oms-pin-unlocked';

interface PinGateProps {
  children: React.ReactNode;
  label?: string;
}

export function PinGate({ children, label }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);

  const submit = useCallback((value: string) => {
    if (value === PIN) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits('');
      }, 500);
    }
  }, []);

  const press = useCallback((key: string) => {
    if (shake) return;
    if (key === 'backspace') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      const next = d + key;
      if (next.length === 4) {
        setTimeout(() => submit(next), 80);
      }
      return next.length <= 4 ? next : d;
    });
  }, [shake, submit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      if (e.key === 'Backspace') press('backspace');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [press]);

  if (unlocked) return <>{children}</>;

  const keys = ['1','2','3','4','5','6','7','8','9','','0','backspace'];

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Acceso restringido</p>
            {label && (
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        <div
          className={cn(
            'flex gap-4 transition-transform',
            shake && 'animate-[shake_0.4s_ease-in-out]'
          )}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-3 rounded-full border-2 transition-all duration-150',
                i < digits.length
                  ? 'border-primary bg-primary scale-110'
                  : 'border-muted-foreground/30 bg-transparent'
              )}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((key, i) => {
            if (key === '') return <div key={i} />;
            if (key === 'backspace') {
              return (
                <button
                  key={i}
                  onClick={() => press('backspace')}
                  className="flex size-16 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted active:scale-95"
                >
                  <Delete className="size-5" />
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => press(key)}
                className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-lg font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-95"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
