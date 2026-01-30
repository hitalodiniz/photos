'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { PhotographerAvatar, PhotographerBio } from './ProfileHero';
import { PhotographerInfoBar } from './ProfileToolBar';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { getPublicProfileGalerias } from '@/core/services/galeria.service';
import type { Galeria } from '@/core/types/galeria';
import { Loader2 } from 'lucide-react';
import { PublicGaleriaCard } from './PublicGaleriaCard';
import { GaleriaFooter } from '@/components/galeria';
import { usePlan } from '@/hooks/usePlan';
import { BrandWatermark } from '../ui/BrandWatermark';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  website?: string;
  photoPreview: string | null;
  cities: string[];
  backgroundUrl?: string;
  useSubdomain?: boolean;
}

export default function PhotographerContent({
  username,
  fullName,
  miniBio,
  phone,
  instagram,
  website,
  photoPreview,
  cities,
  backgroundUrl,
  useSubdomain = true,
}: ProfileContentProps) {
  const { permissions, planKey } = usePlan();
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded] = useState(false);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 🛡️ 1. Lógica de Background Dinâmico
  const activeBackground = useMemo(() => {
    if (planKey === 'FREE') {
      // Imagem aleatória do app para plano Free
      return 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?q=80&w=2058';
    }
    return backgroundUrl; // Foto do profile para demais planos
  }, [planKey, backgroundUrl]);

  // 🛡️ 2. Lógica de Conteúdo do Header
  const showBio = planKey !== 'FREE';
  const showCities = !['FREE', 'START'].includes(planKey); // Só Plus, Pro e Premium

  // 🛡️ Lógica de Nível de Perfil baseada no Plano
  // SEO e Website Direto costumam ser 'advanced' ou 'premium'
  const canShowWebsite =
    permissions.profileLevel === 'advanced' ||
    permissions.profileLevel === 'seo';
  const showDetailedBio = permissions.profileLevel !== 'basic';

  // 2. Construa o objeto photographer compatível com a interface que definimos
  const photographerData = {
    full_name: fullName,
    username: username,
    phone_contact: phone,
    instagram_link: instagram,
    profile_picture_url: photoPreview,
    use_subdomain: useSubdomain, // 🎯 Agora usa o valor real ou prop
    profile_url: website || '',
    website_url: canShowWebsite ? website : '', // 🛡️ Trava o dado se não tiver nível
    id: '', // O ID não é necessário para os links do footer
  };

  // Busca inicial
  useEffect(() => {
    async function loadData() {
      const res = await getPublicProfileGalerias(username, 1);
      if (res.success) {
        // 🛡️ 3. Lógica de Limite de Galerias
        let limit = 1;
        if (planKey === 'START') limit = 10;
        if (planKey === 'PLUS') limit = 20;
        if (['PRO', 'PREMIUM'].includes(planKey)) limit = 9999;

        setGalerias(res.data.slice(0, limit));
      }
      setIsLoading(false);
    }
    loadData();
  }, [username, planKey]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getPublicProfileGalerias(username, nextPage);

    if (res.success) {
      setGalerias((prev) => [...prev, ...res.data]);
      setHasMore(res.hasMore);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  // Lógica de Scroll para a InfoBar
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const isScrolled = scrollY > 100;

  return (
    <div className="relative min-h-screen bg-black font-sans overflow-x-hidden">
      {/* HERO SECTION - O Editorial apenas provê o fundo e a lógica de altura */}
      <EditorialHero
        title={fullName}
        coverUrl={activeBackground}
        sideElement={
          <PhotographerAvatar
            photoPreview={photoPreview}
            isExpanded={isExpanded}
          />
        }
      >
        {/* 🛡️ Exibe a Bio apenas se o nível de perfil permitir detalhes */}
        {showDetailedBio && (
          <PhotographerBio miniBio={miniBio} isExpanded={isExpanded} />
        )}
      </EditorialHero>
      {/* INFOBAR ADAPTADA (Sticky e flutuante no scroll) */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative z-50"
      >
        <PhotographerInfoBar
          phone={phone}
          instagram={instagram}
          website={photographerData.website_url} // 🛡️ Já filtrado acima
          cities={showCities ? cities : []}
          username={username}
          useSubdomain={photographerData.use_subdomain}
          isScrolled={isScrolled}
          isHovered={isHovered}
        />
      </div>

      {/* ESPAÇADOR PARA CONTEÚDO ADICIONAL NO FUTURO */}
      <main className="relative z-30 max-w-[1600px] mx-auto px-4 py-12 min-h-[40vh]">
        {galerias.length > 0 ? (
          <div className="space-y-12">
            {/* Grid de Galerias */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {galerias.map((galeria) => (
                <PublicGaleriaCard key={galeria.id} galeria={galeria} />
              ))}
            </div>

            {/* 🛡️ Botão Carregar Mais: Apenas se o plano permitir portfólio ilimitado */}
            {hasMore && (planKey === 'PRO' || planKey === 'PREMIUM') && (
              <div className="flex justify-center pt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 border border-[#F3E5AB]/30 text-[#F3E5AB] text-[10px] uppercase tracking-[0.2em] hover:bg-[#F3E5AB] hover:text-black transition-all disabled:opacity-50 min-w-[200px] flex items-center justify-center"
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    'Carregar mais trabalhos'
                  )}
                </button>
              </div>
            )}

            {/* 🛡️ Upgrade Call / Upsell Dinâmico conforme o limite do plano */}
            {((planKey === 'FREE' && galerias.length >= 1) ||
              (planKey === 'START' && galerias.length >= 10) ||
              (planKey === 'PLUS' && galerias.length >= 20)) && (
              <div className="mt-20 text-center space-y-4">
                <div className="w-px h-12 bg-gradient-to-b from-[#F3E5AB]/30 to-transparent mx-auto mb-6" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">
                  {planKey === 'FREE'
                    ? `Conheça o portfólio completo de ${fullName.split(' ')[0]}`
                    : 'Ver mais projetos exclusivos'}
                </p>
                <p className="text-white/30 text-[9px] uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  Este profissional utiliza a tecnologia{' '}
                  <span className="text-white/50">Sua Galeria</span> para
                  entregas de alta performance.
                </p>
              </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#F3E5AB]/40 text-center">
              <div className="w-px h-24 bg-gradient-to-b from-[#F3E5AB]/20 to-transparent mb-8" />
              <p className="text-[10px] uppercase tracking-[0.5em] max-w-sm leading-loose">
                Nenhuma galeria pública disponível no momento.
              </p>
            </div>
          )
        )}
      </main>

      {/* 🛡️ Footer - A prop removeBranding já cuida da marca do app internamente */}
      <GaleriaFooter
        photographer={
          {
            full_name: fullName,
            username,
            phone_contact: phone,
            instagram_link: instagram,
            avatar_url: photoPreview,
          } as any
        }
      />
      {/* 🛡️ Marca d'água flutuante para planos básicos */}
      <BrandWatermark />
    </div>
  );
}
