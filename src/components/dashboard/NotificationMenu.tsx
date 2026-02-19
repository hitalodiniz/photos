'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import {
  Bell,
  BellRing,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  BellOff,
  X,
  ChevronRight,
} from 'lucide-react';

import {
  getLatestNotifications,
  getPushStatus,
  markNotificationsAsRead,
  disablePush,
} from '@/core/services/notification.service';
import { notificationClientService } from '@/core/services/notification-client.service';

import { subscribeUserToPush } from '@/lib/push-notifications';
import { updatePushSubscriptionAction } from '@/core/services/profile.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventDetailsSheet } from '@/components/ui/EventDetailsSheet';

export function NotificationMenu({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // 🎯 Ref para controlar as notificações que eram "novas" nesta sessão de abertura
  const sessionOpenedRef = useRef<string[]>([]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!userId) return;

    getLatestNotifications(userId).then((data) => {
      if (data) setNotifications(data);
    });

    getPushStatus(userId).then(setIsPushEnabled);

    const channel = notificationClientService.subscribeRealtime(
      userId,
      (newNotif) => {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          if (exists) return prev;
          return [newNotif, ...prev].slice(0, 15);
        });
      },
    );

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const togglePush = async () => {
    startTransition(async () => {
      try {
        if (isPushEnabled) {
          await disablePush(userId);
          setIsPushEnabled(false);
        } else {
          const subscription = await subscribeUserToPush();
          const result = await updatePushSubscriptionAction(subscription);
          if (result.success) setIsPushEnabled(true);
        }
      } catch (error: any) {
        console.error(error.message);
      }
    });
  };

  const handleToggle = async () => {
    const nextState = !isOpen;

    if (nextState) {
      // ✅ Ao abrir, guardamos quem é unread nesta sessão
      sessionOpenedRef.current = notifications
        .filter((n) => !n.read_at)
        .map((n) => n.id);

      setIsOpen(true);
    } else {
      // ✅ Ao fechar, se havia notificações não lidas, marcamos como lidas no banco e localmente
      if (unreadCount > 0) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || now })),
        );
        try {
          await markNotificationsAsRead(userId);
        } catch (error) {
          console.error('Erro ao marcar notificações como lidas:', error);
        }
      }
      setIsOpen(false);
    }
  };

  const openEventDetails = (n: any) => {
    if (n.metadata?.event_data) {
      setSelectedEvent(n.metadata.event_data);
      // Não fechamos o menu automaticamente para permitir que ele continue lendo outras
    }
  };

  const icons = {
    info: <Info size={14} className="text-blue-400" />,
    success: <CheckCircle2 size={14} className="text-green-400" />,
    warning: <AlertTriangle size={14} className="text-gold" />,
    error: <XCircle size={14} className="text-red-400" />,
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 text-white/90 hover:text-champagne transition-all rounded-full hover:bg-white/5"
      >
        {unreadCount > 0 ? (
          <BellRing size={20} className="text-champagne animate-pulse" />
        ) : (
          <Bell size={20} />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-semibold flex items-center justify-center rounded-full border-2 border-petroleum">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-3 w-[400px] bg-petroleum border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isPushEnabled ? 'bg-gold/10 text-gold' : 'bg-white/5 text-white/40'}`}
                >
                  {isPushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-extrabold text-champagne uppercase tracking-widest">
                    Notificações
                  </p>
                  <p className="text-[9px] text-white/40 font-medium">
                    Fique por dentro
                  </p>
                </div>
              </div>
              <button
                onClick={togglePush}
                disabled={isPending}
                className={`px-4 py-1.5 rounded-luxury text-[9px] font-semibold uppercase transition-all ${
                  isPushEnabled
                    ? 'border border-white/10 text-white/40 hover:bg-white/5'
                    : 'bg-gold text-petroleum hover:bg-champagne'
                }`}
              >
                {isPending ? '...' : isPushEnabled ? 'Ativo' : 'Ativar Push'}
              </button>
            </div>

            {/* Listagem */}
            <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-black/20">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-white/30 text-[11px] italic font-medium uppercase tracking-widest">
                  Nenhuma atividade recente.
                </div>
              ) : (
                notifications.map((n) => {
                  // Uma notificação é "nova" se não tinha read_at QUANDO o menu foi aberto agora
                  const isNewInThisSession = sessionOpenedRef.current.includes(
                    n.id,
                  );

                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors relative ${!n.read_at ? 'bg-white/[0.02]' : ''}`}
                    >
                      {!n.read_at && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.6)]" />
                      )}

                      <div className="flex gap-4">
                        <div className="mt-1 shrink-0">
                          {icons[n.type as keyof typeof icons] || icons.info}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white leading-tight mb-1">
                            {n.title}
                          </p>
                          <p className="text-[12px] text-white/70 leading-relaxed font-medium line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center justify-between mt-4">
                            <span className="text-[9px] text-white/30 font-semibold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(n.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>

                            <div className="flex items-center gap-4">
                              {/* 🎯 O SEGREDO: Verificamos PRIMEIRO se existe o dado. Se existir, mostramos o botão. */}
                              {n.metadata?.event_data ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Evita conflitos de clique
                                    openEventDetails(n);
                                  }}
                                  className={`font-extrabold text-[10px] uppercase tracking-luxury transition-all hover:text-champagne ${
                                    isNewInThisSession || !n.read_at
                                      ? 'text-gold'
                                      : 'text-white/20 italic'
                                  }`}
                                >
                                  {isNewInThisSession || !n.read_at
                                    ? 'Ver Detalhes'
                                    : 'Visualizado'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white/5 text-center border-t border-white/5">
              <p className="text-[9px] text-white/50 uppercase tracking-[0.4em] font-semibold italic">
                central de notificações
              </p>
            </div>
          </div>
        </>
      )}

      <EventDetailsSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
