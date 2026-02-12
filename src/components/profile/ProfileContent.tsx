'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { PhotographerAvatar, ProfileBio } from './ProfileHero';
import { ProfileToolBar } from './ProfileToolBar';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { getPublicProfileGalerias } from '@/core/services/galeria.service';
import type { Galeria } from '@/core/types/galeria';
import { Loader2 } from 'lucide-react';
import { PublicGaleriaCard } from './PublicGaleriaCard';
import { GaleriaFooter } from '@/components/galeria';
import { usePlan } from '@/core/context/PlanContext';
import { BrandWatermark } from '../ui/BrandWatermark';
import { useSegment } from '@/hooks/useSegment';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  website?: string;
  photoPreview: string | null;
  cities: string[];
  backgroundUrl?: string | string[];
  useSubdomain?: boolean;
}

export default function ProfileContent({
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
  const { terms } = useSegment();
  const { permissions } = usePlan(); // 🎯 Removido planKey por não ser mais necessário aqui

  const [isLoading, setIsLoading] = useState(true);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 🎯 Lógica de Backgrounds baseada em CAPACIDADE (Carousel Limit)
  const activeBackgrounds = useMemo(() => {
    if (permissions.profileCarouselLimit === 0) return [];
    if (!backgroundUrl) return [];
    return Array.isArray(backgroundUrl) ? backgroundUrl : [backgroundUrl];
  }, [permissions.profileCarouselLimit, backgroundUrl]);

  // 🎯 Lógica de Visibilidade baseada em NÍVEIS DE PERFIL
  const showCities = permissions.profileLevel !== 'basic';
  const canShowWebsite = ['advanced', 'seo'].includes(permissions.profileLevel);
  const showDetailedBio = permissions.profileLevel !== 'basic';

  const profileData = {
    full_name: fullName,
    username: username,
    phone_contact: phone,
    instagram_link: instagram,
    profile_picture_url: photoPreview,
    use_subdomain: useSubdomain,
    website_url: canShowWebsite ? website : '',
  };

  useEffect(() => {
    async function loadInitialData() {
      const res = await getPublicProfileGalerias(username, 1);
      if (res.success) {
        // 🎯 O limite de exibição agora é dinâmico vindo das permissões
        const limit =
          permissions.profileListLimit === 'unlimited'
            ? 9999
            : (permissions.profileListLimit as number);

        setGalerias(res.data.slice(0, limit));

        // Só permite carregar mais se o plano permitir portfólio ilimitado
        if (permissions.profileListLimit === 'unlimited') {
          setHasMore(res.hasMore);
        }
      }
      setIsLoading(false);
    }
    loadInitialData();
  }, [username, permissions.profileListLimit]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || permissions.profileListLimit !== 'unlimited')
      return;

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

  return (
    <div className="relative min-h-screen bg-white font-sans overflow-x-hidden">
      <EditorialHero
        title={fullName}
        coverUrls={activeBackgrounds}
        sideElement={
          <PhotographerAvatar photoPreview={photoPreview} isExpanded={false} />
        }
      >
        {showDetailedBio && <ProfileBio miniBio={miniBio} isExpanded={false} />}
      </EditorialHero>

      <div className="relative z-50">
        <ProfileToolBar
          phone={phone}
          instagram={instagram}
          website={profileData.website_url}
          cities={showCities ? cities : []}
          username={username}
          useSubdomain={profileData.use_subdomain}
        />
      </div>

      <main className="relative z-30 max-w-[1600px] mx-auto px-4 py-6 min-h-[50vh] bg-white">
        {galerias.length > 0 ? (
          <div className="space-y-16">
            <div
              className={`grid gap-6 w-full mx-auto ${
                galerias.length === 1
                  ? 'grid-cols-1 max-w-5xl'
                  : galerias.length === 2
                    ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {galerias.map((galeria) => (
                <div
                  key={galeria.id}
                  className="w-full aspect-[3/2] transition-all duration-500"
                >
                  <PublicGaleriaCard
                    galeria={galeria}
                    isFeatured={galerias.length <= 2}
                  />
                </div>
              ))}
            </div>

            {/* 🎯 Botão parametrizado por permissão ilimitada */}
            {hasMore && permissions.profileListLimit === 'unlimited' && (
              <div className="flex justify-center pt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-10 py-4 border border-gold/20 text-gold text-[11px] uppercase tracking-luxury-widest font-bold hover:bg-gold hover:text-black transition-all duration-500 disabled:opacity-50 min-w-[250px] flex items-center justify-center rounded-sm"
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    `Explorar mais ${terms.items}`
                  )}
                </button>
              </div>
            )}

            {/* 🎯 Rodapé de Branding: Aparece apenas se removeBranding for FALSE */}
            {permissions.profileListLimit !== 'unlimited' &&
              galerias.length >= (permissions.profileListLimit as number) && (
                <div className="mt-20 text-center space-y-4">
                  <div className="w-full h-2 bg-gradient-to-b from-champagne/30 to-transparent mx-auto mb-6" />
                  {!permissions.removeBranding && (
                    <p className="text-petroleum text-[11px] uppercase tracking-luxury-widest max-w-lg mx-auto leading-relaxed">
                      Este {terms.singular} utiliza o app{' '}
                      <span className="font-bold">{terms.site_name}</span> para
                      suas entregas.
                    </p>
                  )}
                </div>
              )}
          </div>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-champagne/40 text-center">
              <div className="w-px h-24 bg-gradient-to-b from-champagne/20 to-transparent mb-8" />
              <p className="text-[10px] uppercase tracking-luxury-widest max-w-sm leading-loose">
                Nenhuma {terms.item} pública disponível no momento.
              </p>
            </div>
          )
        )}
      </main>

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
      <BrandWatermark />
    </div>
  );
}
