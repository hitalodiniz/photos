import webpush from 'web-push';

// Configuração das chaves (devem estar no seu .env)
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  // `mailto:${process.env.NEXT_PUBLIC_EMAIL}`,
  'mailto:suporte@suagaleria.com.br',
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

/**
 * 🚀 DISPARA O PUSH REAL PARA O DISPOSITIVO
 */
export async function sendPushNotification(
  subscription: any,
  payload: { title: string; message: string; link?: string },
) {
  try {
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
    );
    return { success: true, statusCode: response.statusCode };
  } catch (error: any) {
    console.error('[WebPush] Erro ao enviar:', error);

    // Se o endpoint não existe mais (usuário desinstalou ou limpou cache)
    if (error.statusCode === 404 || error.statusCode === 410) {
      return {
        success: false,
        error: 'GONE',
        message: 'Assinatura expirada ou removida.',
      };
    }

    return { success: false, error: error.message };
  }
}
