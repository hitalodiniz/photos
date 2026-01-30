'use server';
import { createInternalNotification } from '@/services/notification.service';

export async function sendTestNotificationAction(userId: string) {
  await createInternalNotification({
    userId,
    title: '🔔 Teste de Notificação',
    message: 'Seu sistema de Web Push está funcionando perfeitamente!',
    type: 'success',
    link: '/dashboard',
  });
  return { success: true };
}
