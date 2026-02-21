'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { PhotographerAvatar, ProfileBio } from './ProfileHero';
import { ProfileToolBar } from './ProfileToolBar';
import { EditorialHero } from '@/components/ui/EditorialHero';
import {
  getProfileCategories,
  getPublicProfileGalerias,
} from '@/core/services/galeria.service';
import type { Galeria, Photographer } from '@/core/types/galeria';
import { ChevronDown, Loader2 } from 'lucide-react';
import { PublicGaleriaCard } from './PublicGaleriaCard';
import { GaleriaFooter } from '@/components/galeria';
import { usePlan } from '@/core/context/PlanContext';
import { getProfilePermission } from '@/core/utils/plan-helpers';
import { BrandWatermark } from '../ui/BrandWatermark';
import { useSegment } from '@/hooks/useSegment';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { Profile } from '@/core/types/profile';

// 🎯 Função de normalização local (removido import de 'path')
const normalizeText = (text: string) =>
  text
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() || '';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  website?: string;
  photoPreview: string | null;
  cities: string[];
  specialties?: string[];
  backgroundUrl?: string | string[];
  useSubdomain?: boolean;
  profile?: Profile;
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
  specialties = [],
  backgroundUrl,
  useSubdomain = true,
  profile,
}: ProfileContentProps) {
  const { terms } = useSegment();
  const { permissions } = usePlan();

  const [isLoading, setIsLoading] = useState(true);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 🎯 Estado do Filtro
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const profileLevel = useMemo(
    () =>
      getProfilePermission(profile, 'profileLevel') || permissions.profileLevel,
    [profile, permissions.profileLevel],
  );
  const profileCarouselLimit = useMemo(
    () =>
      getProfilePermission(profile, 'profileCarouselLimit') ??
      permissions.profileCarouselLimit,
    [profile, permissions.profileCarouselLimit],
  );
  const profileListLimit = useMemo(
    () =>
      getProfilePermission(profile, 'profileListLimit') ??
      permissions.profileListLimit,
    [profile, permissions.profileListLimit],
  );

  const activeBackgrounds = useMemo(() => {
    if (profileCarouselLimit === 0 || !backgroundUrl) return [];

    const normalizeUrl = (url: string) =>
      url
        .trim()
        .replace(/^https:\/(?!\/)/, 'https://')
        .replace(/^http:\/(?!\/)/, 'http://');

    let urls: string[] = [];

    if (Array.isArray(backgroundUrl)) {
      urls = backgroundUrl;
    } else if (typeof backgroundUrl === 'string') {
      const raw = backgroundUrl.trim();

      // Alguns registros antigos podem estar salvos como JSON string: '["https://..."]'
      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          urls = Array.isArray(parsed) ? parsed : [raw];
        } catch {
          urls = [raw];
        }
      } else {
        urls = [raw];
      }
    }

    return urls.filter(Boolean).map(normalizeUrl);
  }, [profileCarouselLimit, backgroundUrl]);

  const showCities = profileLevel !== 'basic';
  const canShowWebsite = ['advanced', 'seo'].includes(profileLevel);
  const showDetailedBio = profileLevel !== 'basic';

  // 🎯 Filtro Computado Atualizado
  const filteredGalerias = useMemo(() => {
    if (!activeFilter || activeFilter === 'all') return galerias;

    const term = normalizeText(activeFilter);

    return galerias.filter((g) => {
      // 1. Obtém o label amigável se existir no config, caso contrário usa o ID bruto do banco
      const categoryConfig = GALLERY_CATEGORIES.find(
        (c) => c.id === g.category,
      );
      const catLabel = categoryConfig ? categoryConfig.label : g.category || '';

      // 2. Normaliza para comparação precisa
      const normalizedCatLabel = normalizeText(catLabel);
      const normalizedTitle = normalizeText(g.title);
      const normalizedLocation = normalizeText(g.location || '');

      // 3. Verifica se o filtro ativo (term) corresponde exatamente ou está contido nos campos
      return (
        normalizedTitle.includes(term) ||
        normalizedCatLabel === term || // Comparação exata para categorias
        normalizedCatLabel.includes(term) ||
        normalizedLocation.includes(term)
      );
    });
  }, [galerias, activeFilter]);

  useEffect(() => {
    async function loadInitialData() {
      const res = await getPublicProfileGalerias(username, 1);

      // 2. Busca TODAS as categorias do banco (Independente da paginação)
      // Você precisa passar o ID do usuário (profile.id)
      if (profile?.id) {
        const catIds = await getProfileCategories(profile.id);

        // Mapeia para os labels usando seu arquivo de config
        const labels = catIds.map((id) => {
          return GALLERY_CATEGORIES.find((c) => c.id === id)?.label || id;
        });
        setAllCategories(labels);
      }

      if (res.success) {
        const limit =
          profileListLimit === 'unlimited'
            ? 9999
            : (profileListLimit as number);
        setGalerias(res.data.slice(0, limit));
        if (profileListLimit === 'unlimited') setHasMore(res.hasMore);
      }
      setIsLoading(false);
    }
    loadInitialData();
  }, [username, profileListLimit, profile?.id]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || profileListLimit !== 'unlimited') return;
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

  const footerPhotographer = useMemo<Photographer>(
    () => ({
      id: username,
      full_name: fullName,
      username,
      profile_picture_url: photoPreview,
      phone_contact: phone || null,
      instagram_link: instagram || null,
      use_subdomain: useSubdomain,
      website: website || null,
      plan_key: profile?.plan_key || 'FREE',
    }),
    [
      username,
      fullName,
      photoPreview,
      phone,
      instagram,
      useSubdomain,
      website,
      profile,
    ],
  );

  const footerGaleria = useMemo<Galeria>(
    () => ({
      id: `profile-${username}`,
      title: `Perfil de ${fullName}`,
      client_name: fullName,
      date: new Date().toISOString(),
      location: cities[0] || '',
      slug: username,
      cover_image_url: activeBackgrounds[0] || null,
      cover_image_ids: null,
      drive_folder_id: null,
      is_public: true,
      password: null,
      user_id: username,
      category: 'profile',
      has_contracting_client: false,
      client_whatsapp: phone || null,
      drive_folder_name: null,
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      show_cover_in_grid: true,
      grid_bg_color: '#FFFFFF',
      columns_mobile: 2,
      columns_tablet: 3,
      columns_desktop: 4,
      show_on_profile: true,
      leads_enabled: false,
      leads_require_name: false,
      leads_require_email: false,
      leads_require_whatsapp: false,
      rename_files_sequential: false,
      photo_count: 0,
      enable_favorites: false,
      enable_slideshow: false,
      google_refresh_token: null,
      gallery_tags: null,
      photo_tags: null,
      photographer_name: fullName,
      photographer_avatar_url: photoPreview,
      photographer_phone: phone || null,
      photographer_instagram: instagram || null,
      photographer_email: null,
      photographer_url: `/${username}`,
      photographer_message_templates: {
        CARD_SHARE: '',
        card_share: '',
        photo_share: '',
        guest_share: '',
      },
      photographer_username: username,
      photographer_id: username,
      use_subdomain: useSubdomain,
      photographer: footerPhotographer,
    }),
    [
      username,
      fullName,
      cities,
      activeBackgrounds,
      phone,
      photoPreview,
      instagram,
      useSubdomain,
      footerPhotographer,
    ],
  );

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
          website={canShowWebsite ? website : ''}
          cities={showCities ? cities : []}
          specialties={showCities ? specialties : []}
          username={username}
          useSubdomain={useSubdomain}
          onFilterChange={setActiveFilter} // 🎯 Conexão com a Toolbar
          activeFilter={activeFilter}
          categories={allCategories}
        />
      </div>

      <main className="relative z-30 max-w-[1600px] mx-auto px-2 py-2 min-h-[50vh] bg-white">
        {filteredGalerias.length > 0 ? (
          <div className="space-y-2">
            <div
              className={`grid gap-2 w-full mx-auto ${
                filteredGalerias.length === 1
                  ? 'grid-cols-1 max-w-5xl'
                  : filteredGalerias.length === 2
                    ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {filteredGalerias.map((galeria) => (
                <div key={galeria.id} className="w-full aspect-[3/2]">
                  <PublicGaleriaCard galeria={galeria} />
                </div>
              ))}
            </div>
            {hasMore && profileListLimit === 'unlimited' && (
              <div className="flex justify-center pt-16 pb-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="group relative flex flex-col items-center gap-4 transition-all duration-300"
                >
                  {/* Texto com tracking luxuoso */}
                  <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-petroleum/60 group-hover:text-gold transition-colors">
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        Carregando{' '}
                        <Loader2 size={14} className="animate-spin" />
                      </span>
                    ) : (
                      `Explorar mais ${terms.items}`
                    )}
                  </span>

                  {/* Linha decorativa animada */}
                  <div className="relative w-24 h-[1px] bg-petroleum/10 overflow-hidden">
                    <div
                      className={`absolute inset-0 bg-gold transition-transform duration-500 ease-in-out ${
                        loadingMore
                          ? 'translate-x-0 animate-pulse'
                          : '-translate-x-full group-hover:translate-x-0'
                      }`}
                    />
                  </div>

                  {/* Círculo com ícone (opcional, para dar peso visual) */}
                  {!loadingMore && (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-petroleum/10 text-petroleum/40 group-hover:border-gold/30 group-hover:text-gold transition-all duration-300">
                      <ChevronDown
                        size={18}
                        className="group-hover:translate-y-0.5 transition-transform"
                      />
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="py-20 text-center">
              <p className="text-[10px] uppercase tracking-luxury-widest text-champagne/60">
                {activeFilter !== 'all'
                  ? `Nenhum resultado para "${activeFilter}"`
                  : `Nenhuma ${terms.item} disponível.`}
              </p>
            </div>
          )
        )}
      </main>

      <GaleriaFooter
        galeria={footerGaleria}
        photographer={footerPhotographer}
      />
      <BrandWatermark />
    </div>
  );
}
