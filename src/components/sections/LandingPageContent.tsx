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
} from 'lucide-react';
import EditorialView from '../layout/EditorialView';

export default function LandingPageContent() {
  const features = useMemo(
    () => [
      {
        icon: <Camera size={22} />,
        title: 'Fotos Ultra HD',
        desc: 'Preservação de cada pixel e cor original.',
      },
      {
        icon: <Zap size={22} />,
        title: 'Fluxo Instantâneo',
        desc: 'Subiu no Drive, está na galeria em tempo real.',
      },
      {
        icon: <Smartphone size={22} />,
        title: 'Mobile First',
        desc: 'Experiência fluida e elegante no celular.',
      },
      {
        icon: <Infinity size={22} />,
        title: 'Fotos Ilimitadas',
        desc: 'Sem barreiras ou limites de upload.',
      },
      {
        icon: <Cloud size={22} />,
        title: 'Cloud Power',
        desc: 'Hospedagem direta no seu Google Drive™.',
      },
      {
        icon: <ShieldCheck size={22} />,
        title: 'Segurança',
        desc: 'Acesso protegido por senha profissional.',
      },
    ],
    [],
  );

  return (
    <EditorialView
      title="Sua Galeria"
      subtitle={
        <>
          Onde o seu{' '}
          <span className="italic font-semibold text-white">Google Drive™</span>{' '}
          vira uma obra de arte
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full max-w-[1500px] mx-auto">
        {/* LADO ESQUERDO: RECURSOS (Aumentados) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((item, index) => (
              <div
                key={index}
                className="flex flex-col bg-white rounded-luxury overflow-hidden shadow-2xl transition-all hover:scale-[1.03] border border-slate-100 group"
              >
                {/* HEADER DO CARD: Sincronizado com a Toolbar (Petroleum + Blur) */}
                <div className="relative h-11 flex items-center shrink-0 overflow-hidden">
                  {/* Camada de fundo Petroleum com Blur */}
                  <div className="absolute inset-0 bg-petroleum/95 backdrop-blur-md z-0" />

                  {/* Borda inferior sutil para separação de "vidro" */}
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10 z-10" />

                  <div className="relative z-20 px-5 flex items-center gap-4 w-full">
                    <div className="text-gold shrink-0 drop-shadow-[0_0_8px_rgba(243,229,171,0.4)]">
                      {item.icon}
                    </div>
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-white/90 leading-none">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* CORPO DO CARD */}
                <div className="p-7 bg-white flex-grow flex items-center">
                  <p className="text-[15px] text-petroleum/80 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🎯 LADO DIREITO: CARD DE LOGIN (Compacto e Centralizado) */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="bg-white rounded-luxury shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-10 md:p-12 border-t-4 border-gold relative text-center">
            {/* Badge de Acesso (Vidro Petroleum) */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-petroleum text-gold text-[10px] font-bold px-5 py-2 rounded-full uppercase tracking-widest shadow-xl whitespace-nowrap">
              Acesso Profissional
            </div>

            {/* Título Artístico */}
            <h2 className="text-petroleum text-[18px] md:text-[24px] font-bold mb-4 tracking-tight leading-tight italic font-artistic">
              Bem-vindo à sua galeria
            </h2>

            {/* TEXTO ATUALIZADO: "Galeria" */}
            <p className="text-petroleum/70 text-[15px] md:text-[17px] font-medium mb-10 leading-relaxed italic mx-auto max-w-[340px]">
              Conecte seu{' '}
              <span className="text-petroleum font-bold">Google Drive™</span> e
              apresente suas fotos em uma{' '}
              <span className="text-petroleum font-bold">
                galeria de alto padrão
              </span>
              , sem uploads e sem perda de qualidade.
            </p>

            {/* Área de Ação */}
            <div className="flex flex-col gap-8 items-center">
              {/* Botão Google (Largura controlada para luxo) */}
              <div className="w-full max-w-[280px] transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                <GoogleSignInButton />
              </div>

              {/* Footer do Card */}
              <div className="space-y-4 pt-6 border-t border-slate-100 w-full">
                <p className="text-[11px] text-petroleum italic leading-relaxed mx-auto max-w-[240px]">
                  Utilizamos a API oficial do Google para garantir que suas
                  fotos nunca saiam do seu controle.
                </p>

                <div className="flex justify-center items-center gap-2.5 text-petroleum text-[10px] font-bold uppercase tracking-widest">
                  <ShieldCheck size={16} />
                  <span>Ambiente 100% Seguro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EditorialView>
  );
}
