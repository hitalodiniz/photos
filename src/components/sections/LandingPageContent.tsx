'use client';
import EditorialPageBase from '@/components/layout/EditorialPageBase';
import { EditorialHeader } from '@/components/layout';
import { GoogleSignInButton } from '@/components/auth';
import TrustSeal from '@/components/ui/TrustSeal';
import {
  Camera,
  Zap,
  Smartphone,
  Infinity,
  Cloud,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';

export default function LandingPageContent() {
  const features = [
    {
      icon: <Camera />,
      title: 'Fotos Ultra HD',
      desc: 'Preservação de cada pixel e cor original.',
    },
    {
      icon: <Zap />,
      title: 'Fluxo Instantâneo',
      desc: 'Subiu no Drive, apareceu na galeria.',
    },
    {
      icon: <Smartphone />,
      title: 'Mobile First',
      desc: 'Experiência fluida e elegante no celular.',
    },
    {
      icon: <Infinity />,
      title: 'Fotos Ilimitadas',
      desc: 'Sem barreiras ou limites de upload.',
    },
  ];

  return (
    <EditorialPageBase heroImageUrl="/images/landing-hero.jpg">
      <EditorialHeader
        title="Sua Galeria"
        subtitle={
          <>
            A vitrine definitiva para suas{' '}
            <span className="font-semibold border-b border-gold/50 text-white italic">
              fotos profissionais
            </span>
          </>
        }
        showBackButton={false}
        iconPosition="top"
      />

      <div className="max-w-[1500px] mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch py-12">
        {/* RECURSOS */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-luxury overflow-hidden shadow-2xl transition-all hover:scale-[1.02]"
              >
                <div className="bg-petroleum p-4 flex items-center gap-3">
                  <div className="text-gold">
                    {React.cloneElement(item.icon as React.ReactElement, {
                      size: 20,
                    })}
                  </div>
                  <h3 className="text-[14px] font-bold uppercase tracking-widest text-white">
                    {item.title}
                  </h3>
                </div>
                <div className="p-6 bg-white/95">
                  <p className="text-[15px] text-petroleum/70 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-luxury shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 border-t-4 border-gold text-center lg:text-left">
            <h2 className="text-petroleum text-[28px] font-bold mb-4 leading-tight">
              Suas fotos merecem uma vitrine profissional.
            </h2>
            <p className="text-petroleum/80 text-[15px] font-medium mb-10 leading-relaxed">
              Transforme pastas do Drive em uma{' '}
              <strong>experiência editorial</strong> instantaneamente.
            </p>
            <div className="p-1 bg-slate-50 rounded-lg border border-slate-200 mb-6">
              <GoogleSignInButton />
            </div>
            <p className="text-[12px] text-petroleum/60 italic">
              * Não armazenamos suas fotos.
            </p>
          </div>
        </div>
      </div>

      <TrustSeal
        text="Ambiente 100% seguro • Google Verified"
        className="mb-12"
      />
    </EditorialPageBase>
  );
}
