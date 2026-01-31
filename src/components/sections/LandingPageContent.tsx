'use client';
import React, { useMemo } from 'react';
import { GoogleSignInButton } from '@/components/auth';
import {
  Zap,
  Smartphone,
  Camera,
  Infinity,
  Cloud,
  ShieldCheck,
  MousePointerClick,
} from 'lucide-react';
import EditorialView from '../layout/EditorialView';

export default function LandingPageContent() {
  const features = useMemo(
    () => [
      {
        icon: <Camera size={20} />,
        title: 'Curadoria Ultra HD',
        desc: 'Sua arte preservada na resolução nativa, sem compressão agressiva.',
      },
      {
        icon: <Zap size={20} />,
        title: 'Sincronia Imediata',
        desc: 'Organizou no Google Drive™, a galeria se atualiza instantaneamente.',
      },
      {
        icon: <Smartphone size={20} />,
        title: 'Design Mobile-First',
        desc: 'Interface pensada para a palma da mão do seu cliente final.',
      },
      {
        icon: <Infinity size={20} />,
        title: 'Arquivos Ilimitados',
        desc: 'Aproveite todo o potencial do seu armazenamento na nuvem.',
      },
      {
        icon: <Cloud size={20} />,
        title: 'Integração Nativa',
        desc: 'Sem novos uploads. Usamos o poder direto do Google Cloud™.',
      },
      {
        icon: <ShieldCheck size={20} />,
        title: 'Privacidade Elite',
        desc: 'Segurança robusta para entregas profissionais e exclusivas.',
      },
    ],
    [],
  );

  return (
    <EditorialView
      title="Sua Galeria"
      subtitle={
        <span className="font-light tracking-tight text-white/80">
          A moldura digital de luxo para o seu{' '}
          <span className="italic font-serif text-gold">Google Drive™</span>
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start w-full max-w-[1400px] mx-auto py-10">
        {/* LADO ESQUERDO: GRID DE RECURSOS */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((item, index) => (
              <div
                key={index}
                className="group flex flex-col bg-white/95 rounded-luxury overflow-hidden shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-gold/10 border border-white/20"
              >
                {/* HEADER DO CARD (Efeito Vidro Profissional) */}
                <div className="relative h-12 flex items-center bg-petroleum overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-petroleum to-petroleum/80 backdrop-blur-sm" />
                  <div className="relative z-10 px-6 flex items-center gap-3 w-full">
                    <div className="text-gold opacity-80 group-hover:opacity-100 transition-opacity">
                      {item.icon}
                    </div>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* CORPO DO CARD */}
                <div className="p-8 flex-grow">
                  <p className="text-[14px] text-petroleum/70 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DIREITO: CARD DE CONVERSÃO (O "Hero" da Landing) */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-luxury shadow-2xl p-10 md:p-14 border-b-8 border-gold text-center overflow-hidden relative">
            {/* Elemento Decorativo de Fundo */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

            {/* Badge de Status */}
            <div className="inline-flex items-center gap-2 bg-petroleum/5 text-petroleum text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter mb-8">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              Sincronização Ativa
            </div>

            <h2 className="text-petroleum text-3xl md:text-4xl font-serif mb-6 leading-tight">
              Transforme seu <br />
              <span className="italic">fluxo de entrega</span>
            </h2>

            <p className="text-petroleum/60 text-[16px] md:text-[18px] font-light mb-12 leading-relaxed">
              Elimine links genéricos. Ofereça uma
              <span className="text-petroleum font-semibold">
                {' '}
                experiência de marca{' '}
              </span>
              que valoriza cada clique do seu cliente.
            </p>

            <div className="flex flex-col gap-6 items-center">
              <div className="w-full max-w-[320px] transition-transform hover:scale-[1.03]">
                <GoogleSignInButton />
              </div>

              <div className="pt-8 border-t border-slate-100 w-full">
                <div className="flex justify-center items-center gap-3 text-petroleum/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <ShieldCheck size={14} className="text-gold" />
                  <span>Criptografia de ponta a ponta</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chamada Secundária (Social Proof ou Trust) */}
          <div className="mt-8 text-center text-white/40 text-[11px] uppercase tracking-widest font-medium">
            Utilizado por fotógrafos de elite em todo o Brasil
          </div>
        </div>
      </div>
    </EditorialView>
  );
}
