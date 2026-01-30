'use client';
import React, { useState, useEffect } from 'react';
import { PhotographerAvatar, PhotographerBio } from './ProfileHero';
import { PhotographerInfoBar } from './ProfileToolBar';
import { EditorialHero } from '@/components/ui/EditorialHero';
import { getPublicProfileGalerias } from '@/core/services/galeria.service';
import type { Galeria } from '@/core/types/galeria';
import { Loader2 } from 'lucide-react';
import { PublicGaleriaCard } from './PublicGaleriaCard';
import { GaleriaFooter } from '@/components/galeria';

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
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded] = useState(false);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 2. Construa o objeto photographer compatível com a interface que definimos
  const photographerData = {
    full_name: fullName,
    username: username,
    phone_contact: phone,
    instagram_link: instagram,
    profile_picture_url: photoPreview,
    use_subdomain: useSubdomain, // 🎯 Agora usa o valor real ou prop
    profile_url: website || '',
    id: '', // O ID não é necessário para os links do footer
  };

  // Busca inicial
  useEffect(() => {
    async function loadInitialData() {
      const res = await getPublicProfileGalerias(username, 1);
      if (res.success) {
        setGalerias(res.data);
        setHasMore(res.hasMore);
      }
      setIsLoading(false);
    }
    loadInitialData();
  }, [username]);

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
        coverUrl={backgroundUrl}
        sideElement={
          <PhotographerAvatar
            photoPreview={photoPreview}
            isExpanded={isExpanded}
          />
        }
      >
        <PhotographerBio miniBio={miniBio} isExpanded={isExpanded} />
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
          website={website}
          cities={cities}
          username={username}
          useSubdomain={photographerData.use_subdomain}
          isScrolled={isScrolled}
          isHovered={isHovered}
        />
      </div>

      {/* ESPAÇADOR PARA CONTEÚDO ADICIONAL NO FUTURO */}
      <main className="relative z-30 max-w-[1600px] mx-auto px-4 py-4 min-h-[40vh]">
        {galerias.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
              {galerias.map((galeria) => (
                <PublicGaleriaCard key={galeria.id} galeria={galeria} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 border border-[#F3E5AB]/30 text-[#F3E5AB] text-[10px] uppercase tracking-[0.2em] hover:bg-[#F3E5AB] hover:text-black transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Carregar mais trabalhos'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center text-[#F3E5AB]/40">
              <div className="w-px h-24 bg-gradient-to-b from-[#F3E5AB]/20 to-transparent mb-8" />
              <p className="text-[10px] uppercase tracking-[0.5em]">
                Nenhuma galeria pública disponível no momento.
              </p>
            </div>
          )
        )}
      </main>

      <GaleriaFooter
        photographer={photographerData}
        title="Portfólio Profissional"
      />
    </div>
  );
}
