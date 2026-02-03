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
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import EditorialView from '../layout/EditorialView';
import router from 'next/router';

export default function LandingPageContent() {
  const benefits = useMemo(
    () => [
      {
        title: 'Suas fotos rendem mais',
        items: [
          'Toda foto importa',
          'Qualidade superior ao Instagram',
          'Protege suas memórias em alta resolução',
          'Subiu no Drive, está na galeria em tempo real',
        ],
      },
      {
        title: 'A galeria fica na sua nuvem',
        items: [
          'Hospedagem direta no seu Google Drive™',
          'Acesso protegido pela autenticação do Google™',
          'Acesso quando e onde quiser',
          'Sem barreiras ou limites de upload',
        ],
      },
      {
        title: 'Acessível e para todos',
        items: [
          'Planos a partir de R$ 29/mês',
          'Interface descomplicada',
          'Suporte profissional incluído',
          'Experiência fluida e elegante no celular',
        ],
      },
    ],
    [],
  );

  return (
    <EditorialView
      title="Sua Galeria"
      subtitle={
        <>
          Transformando o seu{' '}
          <span className="italic font-semibold text-white">Google Drive™</span>{' '}
          em uma Galeria Profissional
        </>
      }
      altura="h-[75vh]"
      showHeroAction={true}
    >
      {/* SEÇÃO 1: RECURSOS - Layout Grid Limpo */}

      {/* SEÇÃO 2: POR QUE ESCOLHER - Inspirado no "Por que milhões preferem" */}
      <section className="w-full bg-white py-10 shadow-sm border-y border-slate-100">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="text-center mb-20 md:mb-24">
            <p className="text-gold text-xs uppercase tracking-[0.2em] font-semibold mb-3">
              O Essencial para suas Fotos
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-petroleum italic mb-4">
              Por que fotógrafos escolhem a Sua Galeria?
            </h2>
            <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto font-medium">
              Na Sua Galeria suas fotos crescem com segurança, de forma
              acessível e com opções para cada objetivo profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-3xl overflow-visible shadow-lg flex flex-col relative border border-slate-100 group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
              >
                {/* Barra lateral colorida inspirada no Tesouro Direto */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl transition-all duration-500 group-hover:w-3"
                  style={{ backgroundColor: benefit.accent }}
                />

                {/* Ícone Circular Posicionado no topo (metade para fora) */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-petroleum flex items-center justify-center text-white shadow-xl z-10 transition-transform group-hover:scale-110">
                  {idx === 0 && <Camera size={32} strokeWidth={1.5} />}
                  {idx === 1 && <Cloud size={32} strokeWidth={1.5} />}
                  {idx === 2 && <Smartphone size={32} strokeWidth={1.5} />}
                </div>

                <div className="p-10 pt-16 flex flex-col h-full text-center">
                  <h3 className="text-petroleum text-xl font-semibold leading-tight mb-8 min-h-[3rem]">
                    {benefit.title}
                  </h3>

                  <ul className="space-y-5 text-left">
                    {benefit.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-4 text-slate-900 text-sm font-medium leading-relaxed"
                      >
                        <CheckCircle2
                          size={20}
                          className="text-gold shrink-0 mt-0.5"
                          strokeWidth={2.5}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </EditorialView>
  );
}
