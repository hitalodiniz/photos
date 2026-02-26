'use client';

import { useTransition } from 'react';
import { subscribeUserToPush } from '@/lib/push-notifications';
import { updatePushSubscriptionAction } from '@/core/services/profile.service';
import { useToast } from '@/hooks/useToast';

export function PushNotificationSettings() {
  const [isPending, startTransition] = useTransition();
  const { showToast, ToastElement } = useToast();

  const handleEnablePush = async () => {
    startTransition(async () => {
      try {
        const subscription = await subscribeUserToPush();
        const result = await updatePushSubscriptionAction(subscription);

        if (result.success) {
          showToast('Notificações ativadas com sucesso!', 'success');
        } else {
          showToast(result.error || 'Erro ao salvar configurações.', 'error');
        }
      } catch (error: any) {
        showToast(error.message || 'Falha ao ativar notificações.', 'error');
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

      {ToastElement}
    </div>
  );
}
