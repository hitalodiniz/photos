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
  Images,
} from 'lucide-react';

import {
  getLatestNotifications,
  getPushStatus,
  markNotificationsAsRead,
  disablePush,
  markNotificationsAsReadUnique,
} from '@/core/services/notification.service';
import { notificationClientService } from '@/core/services/notification-client.service';

import { subscribeUserToPush } from '@/lib/push-notifications';
import { updatePushSubscriptionAction } from '@/core/services/profile.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventDetailsSheet } from '@/components/ui/EventDetailsSheet';
import { TrafficInfoCard } from './TrafficInfoCard';

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

    // 1. Busca inicial (Mantém as antigas)
    getLatestNotifications(userId).then((data) => {
      if (data) setNotifications(data);
    });

    getPushStatus(userId).then(setIsPushEnabled);

    // 2. Realtime Inteligente
    const channel = notificationClientService.subscribeRealtime(
      userId,
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        setNotifications((prev) => {
          // SE FOR UMA NOVA NOTIFICAÇÃO (INSERT)
          if (eventType === 'INSERT') {
            const exists = prev.some((n) => n.id === newRecord.id);
            if (exists) return prev;
            return [newRecord, ...prev].slice(0, 15); // Adiciona no topo e limita a 15
          }

          // SE FOR MUDANÇA DE STATUS (UPDATE - Ex: Marcar como lido)
          if (eventType === 'UPDATE') {
            return prev.map((n) =>
              n.id === newRecord.id ? { ...n, ...newRecord } : n,
            );
          }

          return prev;
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

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Função auxiliar para atualizar o estado local instantaneamente e sincronizar no banco
  const markAsReadLocally = async () => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || now })),
    );

    try {
      // Usa o serviço de lote para o usuário inteiro
      await markNotificationsAsRead(userId);
    } catch (error) {
      console.error('Erro ao sincronizar leitura total:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    await markAsReadLocally();
  };

  const openEventDetails = async (n: any) => {
    if (n.metadata?.event_data) {
      setSelectedEvent(n.metadata.event_data);

      if (!n.read_at) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, read_at: now } : item,
          ),
        );
        await markNotificationsAsReadUnique(n.id); // Apenas esta
      }
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
        {unreadCount > 0 && !isOpen ? (
          <BellRing size={20} className="text-champagne animate-pulse" />
        ) : (
          <Bell size={20} />
        )}
        {unreadCount > 0 && !isOpen && (
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
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between gap-4">
              {/* LADO ESQUERDO: ÍCONE E TÍTULO */}
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`p-2 rounded-luxury transition-colors ${
                    isPushEnabled
                      ? 'bg-champagne text-petroleum'
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {isPushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest leading-none">
                    Notificações
                  </p>
                  {unreadCount === 0 && (
                    <span className="text-[10px] text-white/80 font-medium mt-1">
                      Todas lidas
                    </span>
                  )}
                </div>
              </div>

              {/* LADO DIREITO: BOTÕES ALINHADOS */}
              <div className="flex items-center gap-2">
                {/* Botão Marcar Todas - Agora alinhado horizontalmente */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white text-white hover:text-petroleum border border-white/10 rounded-luxury text-[9px] font-semibold uppercase tracking-tight transition-all active:scale-95 whitespace-nowrap"
                  >
                    Marcar como lidas
                  </button>
                )}

                {/* Botão Ativar Push - Mantido original conforme pedido */}
                <button
                  onClick={togglePush}
                  disabled={isPending}
                  className={`px-4 py-1.5 rounded-luxury text-[9px] font-semibold uppercase transition-all whitespace-nowrap ${
                    isPushEnabled
                      ? 'border border-white/10 text-petroleum hover:bg-white/5 hover:text-white/80 bg-champagne'
                      : 'bg-gold text-petroleum hover:bg-champagne'
                  }`}
                >
                  {isPending ? '...' : isPushEnabled ? 'Ativo' : 'Ativar Push'}
                </button>
              </div>
            </div>

            {/* Listagem */}
            <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-white">
              {/* 🎯 INSERÇÃO DO HELP TIP FIXO NO TOPO */}

              {notifications.length === 0 ? (
                <div className="p-12 text-center text-petroleum/30 text-[11px] italic font-medium uppercase tracking-widest">
                  Nenhuma atividade recente.
                </div>
              ) : (
                notifications.map((n) => {
                  // Extração de dados da Galeria do Metadata
                  const galeriaTitle =
                    n.metadata?.event_data?.galeria_title ||
                    n.metadata?.galeria_title;
                  const galeriaUrl =
                    n.metadata?.event_data?.galeria_url ||
                    n.metadata?.galeria_url;
                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 border-b border-petroleum/20 hover:bg-petroleum/[0.02] transition-colors relative ${
                        !n.read_at ? 'bg-champagne/5' : 'bg-transparent'
                      }`}
                    >
                      {/* Indicador de "Não Lido" com Glow suave */}
                      {!n.read_at && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold shadow-[2px_0_10px_rgba(212,175,55,0.3)]" />
                      )}

                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Título em Petróleo para peso visual */}
                          <p className="text-sm font-semibold text-petroleum leading-tight mb-1">
                            {n.title}
                          </p>

                          {/* Mensagem com opacidade reduzida para hierarquia */}
                          <p className="text-[12px] text-petroleum/70 leading-relaxed font-medium line-clamp-2">
                            {n.message}
                          </p>

                          {/* 🎯 SEÇÃO DA GALERIA (Título e Link) */}
                          {galeriaTitle && (
                            <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-petroleum/[0.03] border border-petroleum/5 mt-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Images
                                  size={14}
                                  className="text-gold shrink-0"
                                />
                                <span className="text-[10px] font-bold text-petroleum/80 uppercase tracking-wider truncate">
                                  {galeriaTitle}
                                </span>
                              </div>

                              {galeriaUrl && (
                                <a
                                  href={galeriaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[9px] font-black text-gold hover:text-petroleum transition-colors shrink-0 uppercase tracking-tighter"
                                >
                                  Abrir <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            {/* Data em cinza sutil */}
                            <span className="text-[9px] text-petroleum/80 font-semibold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(n.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>

                            <div className="flex items-center gap-4">
                              {n.metadata?.event_data ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEventDetails(n);
                                  }}
                                  className={`font-semibold text-[10px] uppercase tracking-luxury transition-all duration-300 ${
                                    !n.read_at
                                      ? 'text-gold hover:text-petroleum'
                                      : 'text-petroleum/80 italic'
                                  }`}
                                >
                                  {!n.read_at ? 'Ver Detalhes' : 'Visualizado'}
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
              <TrafficInfoCard variant="minimal" />
            </div>
          </div>
        </>
      )}

      <EventDetailsSheet
        event={selectedEvent}
        allEvents={notifications}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
