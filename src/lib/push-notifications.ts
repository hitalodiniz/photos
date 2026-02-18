/**
 * 🛠️ Função Auxiliar: Converte a VAPID Key de String para Uint8Array
 * Necessário porque a Push API exige a chave em formato binário.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 🔗 REGISTRA E SUBSCREVE O USUÁRIO AO PUSH
 */
export async function subscribeUserToPush() {
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // 1. Verifica suporte básico
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      throw new Error(
        'No iPhone, você precisa adicionar este site à sua "Tela de Início" primeiro (Compartilhar > Adicionar à Tela de Início).',
      );
    }
    throw new Error('Seu navegador não suporta notificações Push.');
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('ERRO: NEXT_PUBLIC_VAPID_PUBLIC_KEY não encontrada no .env');
    throw new Error('Configuração do servidor incompleta.');
  }

  try {
    // 2. Registra o Service Worker (arquivo sw.js deve estar na pasta /public)
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Aguarda o SW ficar ativo para evitar erros de "PushManager not found"
    await navigator.serviceWorker.ready;

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
    // 🎯 O ajuste principal: passamos a chave convertida pelo utilitário
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription.toJSON();
  } catch (error: any) {
    console.error('[PushService] Erro:', error);

    // Repassa mensagens amigáveis já tratadas
    if (
      error.message.includes('bloqueou') ||
      error.message.includes('iPhone') ||
      error.message.includes('Configuração')
    ) {
      throw error;
    }

    throw new Error(
      'Falha técnica ao configurar notificações. Verifique se o arquivo sw.js existe na pasta public.',
    );
  }
}
