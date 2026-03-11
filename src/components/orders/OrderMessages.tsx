import { MessageCircle, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import type { MLMessage } from '@/lib/types';

interface OrderMessagesProps {
  messages: MLMessage[];
  sellerId: string;
  isLoading: boolean;
}

export function OrderMessages({ messages, sellerId, isLoading }: OrderMessagesProps) {
  const unreadCount = messages.filter(
    (m) => String(m.from.user_id) !== sellerId && m.message_date.read === null,
  ).length;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="size-3.5" />
        Mensajes
        {unreadCount > 0 && (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {unreadCount} sin leer
          </span>
        )}
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay mensajes en esta conversación.</p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {[...messages].reverse().map((msg) => {
            const isSeller = String(msg.from.user_id) === sellerId;
            const isUnread = !isSeller && msg.message_date.read === null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
              >
                <span className="mb-0.5 text-[10px] text-muted-foreground">
                  {isSeller ? 'Vendedor' : 'Comprador'} ·{' '}
                  {formatDate(msg.message_date.created, 'dd MMM, HH:mm')}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    isSeller
                      ? 'rounded-tr-sm bg-blue-500 text-white'
                      : isUnread
                        ? 'rounded-tl-sm bg-amber-50 text-foreground ring-1 ring-amber-300'
                        : 'rounded-tl-sm bg-muted text-foreground'
                  }`}
                >
                  {msg.text}
                </div>
                {!isSeller && msg.message_date.read && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground">Leído</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
