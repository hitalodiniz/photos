'use client';
import { sendTestNotificationAction } from '@/actions/notification.actions';
import { updatePushSubscriptionAction } from '@/core/services/profile.service';
import { subscribeUserToPush } from '@/lib/push-notifications';
import { BellRing, Camera } from 'lucide-react';
import { useTransition, useState } from 'react';

export default function GerarLogoPage() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>('');

  const handleTestPush = async () => {
    setStatus('Solicitando permissão...');

    startTransition(async () => {
      try {
        // 1. Pede permissão e pega subscription
        const sub = await subscribeUserToPush();

        // 2. Salva no banco
        await updatePushSubscriptionAction(sub);
        setStatus('Assinatura salva! Enviando push...');

        // 3. Dispara o push de teste (pega o user atual)
        const {
          data: { user },
        } = await getAuthenticatedUser();
        if (user) {
          await sendTestNotificationAction(user.id);
          setStatus('Notificação enviada! Verifique seu navegador/celular.');
        }
      } catch (err: any) {
        setStatus(`Erro: ${err.message}`);
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
      {/* Botão de Teste */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleTestPush}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-petroleum text-champagne rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
        >
          <BellRing size={20} />
          {isPending ? 'Processando...' : 'Testar Notificação Push'}
        </button>
        {status && (
          <p className="text-sm text-petroleum/60 font-mono">{status}</p>
        )}
      </div>
      {/* Container de captura - 512x512 é o ideal para o Google */}
      <div
        id="logo-capture"
        className="w-[512px] h-[512px] flex items-center justify-center bg-white gap-3"
      >
        {/* O círculo luxuoso que você usa no seu app */}
        <div className="p-12 bg-[#0a0a0a] rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
          <Camera
            size={240}
            strokeWidth={1.5}
            className="text-champagne drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
        <div className="p-12 bg-white rounded-full border border-petroleum shadow-2xl flex items-center justify-center text">
          <Camera
            size={240}
            strokeWidth={1.5}
            className="text-petroleum drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
        <div className="p-12 bg-petroleum rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
          <Camera
            size={240}
            strokeWidth={1.5}
            className="text-champagne drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
      </div>
      <div
        id="logo-capture"
        className="w-[192px] h-[192px] flex items-center justify-center bg-white gap-3"
      >
        {/* O círculo luxuoso que você usa no seu app */}
        <div className="p-12 bg-[#0a0a0a] rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
          <Camera
            size={192}
            strokeWidth={1.5}
            className="text-champagne drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
        <div className="p-12 bg-white rounded-full border border-petroleum shadow-2xl flex items-center justify-center text">
          <Camera
            size={192}
            strokeWidth={1.5}
            className="text-petroleum drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
        <div className="p-12 bg-petroleum rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
          <Camera
            size={192}
            strokeWidth={1.5}
            className="text-champagne drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}
