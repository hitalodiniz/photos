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

import router from 'next/router';
import EditorialCard from '../ui/EditorialCard';
import EditorialView from '../layout/EditorialView';

export default function LandingPageContent() {
  const benefits = useMemo(
    () => [
      {
        title: 'Suas fotos rendem mais',
        accent: '#B8860B',
        items: [
          'Toda foto importa',
          'Qualidade superior ao Instagram',
          'Protege suas memórias em alta resolução',
          'Subiu no Drive, está na galeria em tempo real',
        ],
      },
      {
        title: 'A galeria fica na sua nuvem',
        accent: '#1a363d', // Petroleum
        items: [
          'Hospedagem direta no seu Google Drive™',
          'Acesso protegido pela autenticação do Google™',
          'Acesso quando e onde quiser',
          'Sem barreiras ou limites de upload',
        ],
      },
      {
        title: 'Acessível e para todos',
        accent: '#B8860B',
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
      sectionTitle="O Essencial para suas Fotos"
      sectionSubtitle="Por que fotógrafos escolhem a Sua Galeria?"
      sectionDescription="Na Sua Galeria suas fotos crescem com segurança, de forma acessível e com opções para cada objetivo profissional"
    >
      {/* SEÇÃO 1: RECURSOS - Layout Grid Limpo */}

      {/* SEÇÃO 2: POR QUE ESCOLHER - Inspirado no "Por que milhões preferem" */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {benefits.map((benefit, idx) => {
          // 🎯 Mapeamento de ícones baseado no índice ou slug
          const icons = [
            <Camera size={32} strokeWidth={1.5} />,
            <Cloud size={32} strokeWidth={1.5} />,
            <Smartphone size={32} strokeWidth={1.5} />,
          ];

          return (
            <EditorialCard
              key={idx}
              title={benefit.title}
              items={benefit.items}
              icon={icons[idx]}
              accentColor={benefit.accent}
            />
          );
        })}
      </div>
    </EditorialView>
  );
}
