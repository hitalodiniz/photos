import { Camera, Landmark, LucideIcon, Megaphone, Image } from 'lucide-react';
import React, { ReactNode } from 'react';

export type SegmentType = 'PHOTOGRAPHER' | 'EVENT' | 'CAMPAIGN' | 'OFFICE';

interface SegmentDictionary {
  singular: string;
  plural: string;
  item: string;
  items: string;
  identity: string;
  segment_icon: LucideIcon;
  site_name: string;
  site_description: string;
  // Novos campos para o Hero
  heroSubtitle: (segment: SegmentType) => ReactNode;
  sectionSubtitle: (userType: string) => string;
  sectionDescription: (userType: string, terms: any) => string;
}

export const SEGMENT_DICTIONARY: Record<SegmentType, SegmentDictionary> = {
  PHOTOGRAPHER: {
    singular: 'fotógrafo',
    plural: 'fotógrafos',
    item: 'foto',
    items: 'fotos',
    identity: 'uma Galeria Profissional',
    segment_icon: Camera,
    site_name: 'Sua Galeria',
    site_description:
      'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria.',

    heroSubtitle: () => (
      <>
        {/* Encontre profissionais ou transforme seu{' '}
        <span className="italic font-semibold text-white">Google Drive™</span>{' '}
        em uma Galeria Profissional */}
        Transforme seu{' '}
        <span className="italic font-semibold text-white">Google Drive™</span>{' '}
        em uma Galeria Profissional
      </>
    ),
    sectionSubtitle: (userType) =>
      userType === 'photographer'
        ? 'Sua estrutura profissional'
        : 'Encontre o clique perfeito',
    sectionDescription: (userType, terms) =>
      userType === 'explorer'
        ? `Navegue por ${terms.items} públicas e conecte-se direto com ${terms.plural}.`
        : `Toda a tecnologia necessária para entregar ${terms.items} com elegância e baixo custo.`,
  },
  EVENT: {
    singular: 'organizador',
    plural: 'organizadores',
    item: 'evento',
    items: 'eventos',
    identity: 'sua galeria de eventos',
    segment_icon: Image,
    site_name: 'Na Selfie',
    site_description:
      'A galeria oficial do seu evento. Acesse suas fotos e vídeos de forma rápida e elegante.',
    heroSubtitle: (segment) => (
      <>
        Encontre eventos ou transforme seu{' '}
        <span className="italic font-semibold text-white">Google Drive™</span>{' '}
        em sua galeria de eventos
      </>
    ),
    sectionSubtitle: (userType) =>
      userType === 'photographer'
        ? 'Sua estrutura de eventos'
        : 'Encontre eventos incríveis',
    sectionDescription: (userType, terms) =>
      userType === 'explorer'
        ? `Navegue por ${terms.items} públicos e conecte-se direto com ${terms.plural}.`
        : `Toda a tecnologia necessária para entregar ${terms.items} com elegância e baixo custo.`,
  },
  CAMPAIGN: {
    singular: 'candidato',
    plural: 'candidatos',
    item: 'mídia',
    items: 'mídias',
    identity: 'sua plataforma de mobilização',
    segment_icon: Megaphone,
    site_name: 'Em Campanha',
    site_description:
      'Centralize os materiais da sua campanha eleitoral. Mídias oficiais para militantes e eleitores.',
    heroSubtitle: () => (
      <>
        Gerencie mídias ou transforme seu{' '}
        <span className="italic font-semibold text-white">Google Drive™</span>{' '}
        em sua plataforma de mobilização
      </>
    ),
    sectionSubtitle: (userType) =>
      userType === 'photographer'
        ? 'Gestão de campanha digital'
        : 'Acompanhe candidatos',
    sectionDescription: (userType, terms) =>
      userType === 'explorer'
        ? `Acesse as ${terms.items} oficiais e conecte-se com os ${terms.plural}.`
        : `Toda a tecnologia necessária para entregar ${terms.items} de campanha com rapidez.`,
  },
  OFFICE: {
    singular: 'político',
    plural: 'políticos',
    item: 'mídia',
    items: 'mídias',
    identity: 'seu gabinete digital',
    segment_icon: Landmark,
    site_name: 'Em Mandato',
    site_description:
      'Portal de transparência e prestação de contas. Acompanhe as ações e mídias do mandato.',
    heroSubtitle: () => (
      <>
        Transparência total: transforme seu{' '}
        <span className="italic font-semibold text-white">Google Drive™</span>{' '}
        em seu gabinete digital
      </>
    ),
    sectionSubtitle: (userType) =>
      userType === 'photographer'
        ? 'Portal da transparência'
        : 'Preste conta aos cidadãos',
    sectionDescription: (userType, terms) =>
      userType === 'explorer'
        ? `Navegue pelas ${terms.items} do mandato e fale com os ${terms.plural}.`
        : `Plataforma robusta para entrega de ${terms.items} legislativas.`,
  },
};
