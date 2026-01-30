// Public Key:
// BDWr_OyIm9odViCPhLnz5g1XPKK6mdDmB_KWKSatiZCnegIuhSFSbHFU9VQeufImTOtXirsdL2UtSG7AcuWIeF4

// Private Key:
// k78FGpa0dyMjvaiJwWC1OB-0LB4cUTrkfAUdonpm5Ow
// Você precisará das VAPID_PUBLIC_KEY geradas via biblioteca 'web-push'
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * 🔗 REGISTRA E SUBSCREVE O USUÁRIO AO PUSH
 */
export async function subscribeUserToPush() {
  // 1. Verifica suporte básico
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // Tratamento especial para iOS fora da "Home Screen"
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      throw new Error(
        'No iPhone, você precisa adicionar este site à sua "Tela de Início" primeiro.',
      );
    }
    throw new Error('Seu navegador não suporta notificações Push.');
  }

  try {
    // 2. Registra o Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // 3. Solicita permissão
    const permission = await Notification.requestPermission();

    if (permission === 'denied') {
      throw new Error(
        'Você bloqueou as notificações. Reative as permissões nas configurações do seu navegador.',
      );
    }

    if (permission !== 'granted') {
      throw new Error(
        'A permissão para notificações é necessária para ativar os alertas.',
      );
    }

    // 4. Cria a assinatura
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    return subscription.toJSON();
  } catch (error: any) {
    console.error('[PushService] Erro:', error);

    // Se o erro já foi tratado acima, repassa a mensagem. Caso contrário, envia genérico.
    if (
      error.message.includes('bloqueou') ||
      error.message.includes('iPhone')
    ) {
      throw error;
    }

    throw new Error(
      'Falha técnica ao configurar notificações. Tente novamente mais tarde.',
    );
  }
}
