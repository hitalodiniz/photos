'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { PhotographerAvatar, ProfileBio } from './ProfileHero';
import { PhotographerInfoBar } from './ProfileToolBar';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { getPublicProfileGalerias } from '@/core/services/galeria.service';
import type { Galeria } from '@/core/types/galeria';
import { Loader2 } from 'lucide-react';
import { PublicGaleriaCard } from './PublicGaleriaCard';
import { GaleriaFooter } from '@/components/galeria';
import { usePlan } from '@/core/context/PlanContext';
import { BrandWatermark } from '../ui/BrandWatermark';
import { useSegment } from '@/hooks/useSegment'; // 🎯 Import do Hook

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
  const { terms } = useSegment(); // 🎯 Obtendo termos do segmento
  const { permissions, planKey } = usePlan();
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded] = useState(false);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Lógica de Backgrounds
  const activeBackgrounds = useMemo(() => {
    // Se for FREE, enviamos vazio para o EditorialHero usar os DEFAULT_HEROS internos
    if (planKey === 'FREE') return [];

    // Se não houver URL customizada, retorna vazio (o Hero tratará o fallback)
    if (!backgroundUrl) return [];

    // Normaliza para array (suporta legado de string única e novo formato de array)
    return Array.isArray(backgroundUrl) ? backgroundUrl : [backgroundUrl];
  }, [planKey, backgroundUrl]);

  const showCities = !['FREE', 'START'].includes(planKey);
  const canShowWebsite =
    permissions.profileLevel === 'advanced' ||
    permissions.profileLevel === 'seo';
  const showDetailedBio = permissions.profileLevel !== 'basic';

  const photographerData = {
    full_name: fullName,
    username: username,
    phone_contact: phone,
    instagram_link: instagram,
    profile_picture_url: photoPreview,
    use_subdomain: useSubdomain,
    profile_url: website || '',
    website_url: canShowWebsite ? website : '',
    id: '',
  };

  useEffect(() => {
    async function loadData() {
      const res = await getPublicProfileGalerias(username, 1);
      if (res.success) {
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

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans overflow-x-hidden">
      <EditorialHero
        title={fullName}
        coverUrls={activeBackgrounds}
        sideElement={
          <PhotographerAvatar
            photoPreview={photoPreview}
            isExpanded={isExpanded}
          />
        }
      >
        {showDetailedBio && (
          <ProfileBio miniBio={miniBio} isExpanded={isExpanded} />
        )}
      </EditorialHero>

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative z-50"
      >
        <PhotographerInfoBar
          phone={phone}
          instagram={instagram}
          website={photographerData.website_url}
          cities={showCities ? cities : []}
          username={username}
          useSubdomain={photographerData.use_subdomain}
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
                  className={`w-full transition-all duration-500 ${
                    galerias.length === 1
                      ? 'aspect-[21/9] md:aspect-[3/2]'
                      : galerias.length === 2
                        ? 'aspect-[16/10] md:aspect-[3/2]'
                        : 'aspect-[3/2]'
                  }`}
                >
                  <PublicGaleriaCard
                    galeria={galeria}
                    isFeatured={galerias.length <= 2}
                  />
                </div>
              ))}
            </div>

            {hasMore && (planKey === 'PRO' || planKey === 'PREMIUM') && (
              <div className="flex justify-center pt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-10 py-4 border border-gold/20 text-gold text-[11px] uppercase tracking-luxury-widest font-bold hover:bg-gold hover:text-black transition-all duration-500 disabled:opacity-50 min-w-[250px] flex items-center justify-center rounded-sm"
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    `Explorar mais ${terms.items}` // 🎯 Parametrizado: fotos/eventos/mídias
                  )}
                </button>
              </div>
            )}

            {permissions.profileListLimit !== 'unlimited' &&
              galerias.length >= (permissions.profileListLimit as number) && (
                <div className="mt-20 text-center space-y-4">
                  <div className="w-full h-2 bg-gradient-to-b from-champagne/30 to-transparent mx-auto mb-6" />
                  {(planKey === 'FREE' || planKey === 'START') && (
                    <p className="text-petroleum text-[11px] uppercase tracking-luxury-widest max-w-lg mx-auto leading-relaxed">
                      Este {terms.singular} utiliza o app
                      <span className="font-bold"> {terms.site_name}</span> para
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
                Nenhuma {terms.item} pública disponível no momento. // 🎯
                Parametrizado
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
