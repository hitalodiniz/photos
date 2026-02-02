'use client';

import { useState, useTransition } from 'react';
import { subscribeUserToPush } from '@/lib/push-notifications';
import Toast from './Toast';
import { updatePushSubscriptionAction } from '@/core/services/profile.service';

export function PushNotificationSettings() {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const handleEnablePush = async () => {
    // 🎯 Reset inicial do toast
    setToast(null);

    startTransition(async () => {
      try {
        // 1. Browser: Pedir permissão e gerar subscription
        const subscription = await subscribeUserToPush();

        // 2. Server: Salvar no Supabase
        const result = await updatePushSubscriptionAction(subscription);

        if (result.success) {
          setToast({
            message: 'Notificações ativadas com sucesso!',
            type: 'success',
          });
        } else {
          setToast({
            message: result.error || 'Erro ao salvar configurações.',
            type: 'error',
          });
        }
      } catch (error: any) {
        // Trata erro de negação de permissão ou falta de suporte
        setToast({
          message: error.message || 'Falha ao ativar notificações.',
          type: 'error',
        });
      }
    });
  };

  return (
    <div>
      <button
        onClick={handleEnablePush}
        disabled={isPending}
        className="btn-luxury-primary"
      >
        {isPending ? 'Processando...' : '🔔 Ativar Notificações no Celular'}
      </button>

      {/* 🛠️ Integração com seu componente existente */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
