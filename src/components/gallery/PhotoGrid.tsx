'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PhotoAlbum from 'react-photo-album';
import 'react-photo-album/rows.css';
import { Lightbox } from '@/components/gallery';
import {
  Lock,
  Globe,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Download,
  Heart,
  Loader2,
  Filter,
  Instagram,
  MessageCircle,
  User,
  Info,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import Image from 'next/image';

// Sub-componente otimizado para evitar o "piscar"
// Sub-componente para renderizar cada foto no álbum
// 1. RENDERIZADOR DE FOTO CORRIGIDO
// src/components/gallery/PhotoGrid.tsx

// 1. RENDERIZADOR SEM DISTORÇÃO
const RenderPhoto = ({ photo, containerProps }: any) => {
  const custom = photo?.customData;
  if (!custom) return null;

  const { isSelected, toggleFavorite, index, onOpenLightbox } = custom;
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      {...containerProps}
      className="group overflow-hidden rounded-2xl transition-all duration-300 bg-[#F9F5F0]"
      style={{
        ...containerProps.style,
        position: 'relative',
        // O segredo: Trava a proporção do container para a imagem não esticar
        aspectRatio: '4 / 3',
      }}
    >
      {/* BOTÃO DE FAVORITO À ESQUERDA */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(photo.id);
        }}
        className={`absolute top-3 left-3 z-[50] w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-xl
        ${isSelected ? 'bg-[#E67E70] border-transparent shadow-lg' : 'bg-black/40 border-white/20 hover:bg-black/60'}`}
      >
        <Heart
          size={20}
          fill={isSelected ? 'white' : 'none'}
          className="text-white"
        />
      </button>

      {/* ÁREA DE CLIQUE PARA LIGHTBOX */}
      <div
        className="absolute inset-0 z-10 cursor-zoom-in"
        onClick={() => onOpenLightbox(index)}
      />

      <Image
        fill
        src={photo.src}
        alt={photo.alt || 'Galeria'}
        unoptimized
        onLoad={() => setIsLoaded(true)}
        // O object-cover preenche o container que já está na proporção correta
        className={`object-cover transition-all duration-700 ${
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-2xl'
        }`}
      />

      {isSelected && (
        <div className="absolute inset-0 border-4 border-[#E67E70] rounded-2xl pointer-events-none z-20" />
      )}
    </div>
  );
};
export default function PhotoGrid({ photos, galeria }: any) {
  // --- 1. ESTADOS DE INTERFACE E UI ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [displayLimit, setDisplayLimit] = useState(36);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // --- 2. ESTADOS DE DADOS E FAVORITOS ---
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // --- 3. ESTADOS DE DOWNLOAD ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);

  // --- 4. PERSISTÊNCIA E CARREGAMENTO DE FAVORITOS ---
  useEffect(() => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao parsear favoritos', e);
      }
    }
  }, [galeria.id]);

  const toggleFavoriteFromGrid = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const isFav = prev.includes(id);
        const newFavs = isFav ? prev.filter((f) => f !== id) : [...prev, id];
        localStorage.setItem(`fav_${galeria.id}`, JSON.stringify(newFavs));
        return newFavs;
      });
    },
    [galeria.id],
  );

  // --- 5. UTILITÁRIOS E HELPERS ---
  // Adicione o useCallback para estabilizar a função
  const getImageUrl = useCallback(
    (photoId: string, suffix: string = 'w800') => {
      return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
    },
    [],
  );

  const triggerHint = (message: string) => {
    setActiveHint(message);
    setTimeout(() => setActiveHint(null), 4000);
  };

  // --- 6. LÓGICA DE FILTRAGEM E PREPARAÇÃO DO ÁLBUM ---
  const albumPhotos = useMemo(() => {
    const list = showOnlyFavorites
      ? photos.filter((p: any) => favorites.includes(p.id))
      : photos;

    return list.slice(0, displayLimit).map((p: any) => {
      // Tenta pegar a largura/altura real, se não tiver, usa 800x600
      const width = p.imageMediaMetadata?.width || p.width || 800;
      const height = p.imageMediaMetadata?.height || p.height || 600;

      console.log('Largura ' + width);
      console.log(photos[0]);

      return {
        id: p.id,
        src: getImageUrl(p.id, 'w800'),
        width,
        height,
        customData: {
          index: photos.indexOf(p),
          isSelected: favorites.includes(p.id),
          toggleFavorite: toggleFavoriteFromGrid,
          onOpenLightbox: setSelectedPhotoIndex,
        },
      };
    });
  }, [
    showOnlyFavorites,
    photos,
    favorites,
    displayLimit,
    toggleFavoriteFromGrid,
    getImageUrl,
  ]);

  // --- 7. AÇÕES DE DOWNLOAD ZIP ---
  const handleDownloadZip = async (
    targetList: any[],
    zipSuffix: string,
    isFavAction: boolean,
  ) => {
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;

    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;
    const setProgress = isFavAction
      ? setFavDownloadProgress
      : setDownloadProgress;

    try {
      setStatus(true);
      const zip = new JSZip();

      for (let i = 0; i < targetList.length; i++) {
        const response = await fetch(getImageUrl(targetList[i].id, 's0'));
        if (!response.ok) throw new Error('Falha no download');
        const blob = await response.blob();
        zip.file(`foto-${i + 1}.jpg`, blob);
        setProgress(((i + 1) / targetList.length) * 100);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${galeria.title}_${zipSuffix}.zip`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar arquivo ZIP. Verifique sua conexão.');
    } finally {
      setStatus(false);
      setProgress(0);
    }
  };

  const downloadAllAsZip = () => handleDownloadZip(photos, 'completa', false);

  const handleDownloadFavorites = () => {
    const favPhotos = photos.filter((p: any) => favorites.includes(p.id));
    handleDownloadZip(favPhotos, 'favoritas', true);
  };
  return (
    <div className="w-full flex flex-col items-center gap-6 min-h-screen pb-10">
      {' '}
      {/* 1. BARRA DE INFORMAÇÕES EDITORIAL: DESKTOP */}
      {/* BARRA DE INFORMAÇÕES DESKTOP - ADAPTATIVA */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
    hidden md:flex items-center justify-center barra-fantasma z-[50] sticky top-6
    backdrop-blur-xl rounded-full border shadow-2xl mx-auto transition-all duration-500
    ${
      isScrolled && !isHovered
        ? 'p-1.5 px-4 gap-3 bg-black/40 border-white/20 opacity-90 scale-95'
        : 'p-2 px-6 gap-5 bg-black/70 border-white/30 opacity-100 scale-100'
    } 
  `}
      >
        {/* SEÇÃO: STATUS E QTD */}
        <div className="flex items-center gap-3 text-white text-[13px] font-semibold italic">
          <div className="flex items-center gap-2">
            {galeria.is_public ? (
              <Globe
                size={18}
                className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)] animate-pulse"
              />
            ) : (
              <Lock
                size={18}
                className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
              />
            )}

            {(!isScrolled || isHovered) && (
              <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-500">
                {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
              </span>
            )}
          </div>

          <div className="w-[1px] h-4 bg-white/20"></div>

          <div className="flex items-center gap-2">
            <ImageIcon
              size={18}
              className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
            />
            {(!isScrolled || isHovered) && (
              <span className="whitespace-nowrap animate-in fade-in duration-500">
                {photos.length} fotos
              </span>
            )}
          </div>
        </div>

        <div className="w-[1px] h-4 bg-white/20"></div>

        {/* SEÇÃO: DATA E LOCALIZAÇÃO (CORRIGIDA) */}
        <div className="flex items-center gap-3 text-white text-[13px] font-semibold italic">
          <div className="flex items-center gap-2">
            <Calendar
              size={18}
              className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
            />
            <span className="whitespace-nowrap animate-in fade-in duration-500">
              {(!isScrolled || isHovered) &&
                new Date(galeria.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
            </span>
          </div>

          {/* LOCALIZAÇÃO: Agora garantindo exibição no estado expandido */}
          {galeria.location && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3 duration-700">
              <div className="w-[1px] h-4 bg-white/20"></div>
              <div className="flex items-center gap-2 max-w-[250px] truncate">
                <MapPin
                  size={18}
                  className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
                />
                {(!isScrolled || isHovered) && (
                  <span className="tracking-tight">{galeria.location}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO: AÇÕES */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/20">
          {favorites.length > 0 && (
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center justify-center gap-2 rounded-full transition-all duration-500 active:scale-90
          ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}
          ${isScrolled && !isHovered ? 'w-9 h-9 border border-white/20' : 'px-5 h-10 border border-white/10 text-[11px] font-bold tracking-widest'}
        `}
            >
              <Filter size={16} />
              {(!isScrolled || isHovered) && <span>Favoritos</span>}
            </button>
          )}

          <button
            onClick={downloadAllAsZip}
            className={`flex items-center justify-center gap-2 rounded-full bg-[#F3E5AB] text-slate-900 transition-all duration-500 shadow-xl active:scale-95
        ${isScrolled && !isHovered ? 'w-9 h-9' : 'px-5 h-10 text-[12px] font-bold uppercase'}
      `}
          >
            <Download size={16} />
            {(!isScrolled || isHovered) && (
              <span className="tracking-tight">Baixar tudo</span>
            )}
          </button>
        </div>
      </div>
      {/* 1. BARRA DE AÇÕES EDITORIAL ULTRA-COMPACTA para mobile */}
      <div className="w-full flex flex-col items-center z-[50] sticky top-6 md:hidden">
        {/* HINT DINÂMICO UNIFICADO (Fica acima da barra) */}
        <div className="relative w-full flex justify-center">
          <div
            className={`absolute transition-all duration-500 transform 
    ${activeHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
    /* Posicionamento abaixo da barra: top-14 ou top-16 conforme o conteúdo */
    ${activeHint === 'social' ? 'top-14' : 'top-16'}`}
          >
            <div className="bg-[#F3E5AB] text-black rounded-2xl shadow-2xl border border-white/20 p-2 px-5 flex flex-col items-center justify-center min-w-max">
              {/* Triângulo indicador invertido (agora no topo do balão) */}
              <div className="w-3 h-3 bg-[#F3E5AB] rotate-45 mx-auto -mt-3.5 mb-1 shadow-sm"></div>

              {activeHint === 'social' ? (
                /* CONTEÚDO SOCIAL */
                <div className="flex items-center gap-4 py-1">
                  <span className="text-[12px] font-bold uppercase tracking-widest border-r border-black/10 pr-3">
                    Fotógrafo
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${galeria.photographer_whatsapp}`,
                        )
                      }
                      className="text-black active:scale-125 transition-transform"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://instagram.com/${galeria.photographer_instagram}`,
                        )
                      }
                      className="text-black active:scale-125 transition-transform"
                    >
                      <Instagram size={18} />
                    </button>
                    <button
                      onClick={() => window.open(galeria.photographer_website)}
                      className="text-black active:scale-125 transition-transform"
                    >
                      <User size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                /* CONTEÚDO DE TEXTO (INFO OU FILTRO) */
                <div className="text-[13px] font-bold tracking-tight whitespace-pre-line text-left leading-relaxed py-1">
                  {activeHint}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BARRA MOBILE "FANTASMA" */}
        <div
          className={`
    flex items-center backdrop-blur-2xl p-1.5 px-3 rounded-full border shadow-2xl gap-3 max-w-[95vw] mx-auto transition-all duration-500
    ${
      isScrolled && !activeHint
        ? 'bg-black/40 border-white/10 opacity-70 scale-90' // Modo Fantasma no Scroll
        : 'bg-black/80 border-white/20 opacity-100 scale-100'
    } // Modo Sólido em repouso ou interagindo
  `}
        >
          {/* FOTÓGRAFO */}
          <div
            className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
            onClick={() =>
              setActiveHint(activeHint === 'social' ? null : 'social')
            }
          >
            <div className="relative">
              <img
                src={galeria.photographer_avatar_url}
                className={`w-9 h-9 rounded-full border-2 object-cover transition-colors ${activeHint === 'social' ? 'border-[#F3E5AB]' : 'border-[#F3E5AB]/40'}`}
                alt="Fotógrafo"
              />
              <div className="absolute -bottom-0.5 -right-0.5 bg-[#F3E5AB] rounded-full p-0.5 border border-black">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              </div>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-white/10" />

          {/* INFO */}
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeHint && activeHint !== 'social' ? 'bg-[#F3E5AB] text-black' : 'bg-white/10 text-[#F3E5AB]'}`}
            onClick={() => {
              const status = galeria.is_public ? '🔓 Pública' : '🔒 Privada';
              const data = `📅 ${new Date(galeria.date).toLocaleDateString('pt-BR')}`;
              const info = `${status}\n📸 ${photos.length} Fotos\n${data}\n📍 ${galeria.location || 'Evento'}`;
              setActiveHint(activeHint === info ? null : info);
            }}
          >
            <Info size={18} />
          </button>

          <div className="w-[1px] h-5 bg-white/10" />

          {/* AÇÕES */}
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={() => {
                  setShowOnlyFavorites(!showOnlyFavorites);
                  const msg = !showOnlyFavorites
                    ? `Filtrando ${favorites.length} favoritas`
                    : 'Exibindo tudo';
                  triggerHint(msg);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white'}`}
              >
                <Filter size={16} />
              </button>
            )}

            <button
              onClick={() => {
                downloadAllAsZip();
                triggerHint('Gerando arquivo ZIP...');
              }}
              className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/30"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
      {/* 2. BOTÃO FLUTUANTE DE FAVORITOS (REDUZIDO E ELEGANTE) [Referência: image_a57c60.jpg] */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-500">
          <button
            onClick={handleDownloadFavorites}
            className="flex items-center gap-3 bg-[#E67E70] text-white py-2 px-5 rounded-full shadow-[0_10px_30px_rgba(230,126,112,0.4)] border border-white/20 active:scale-95 transition-all"
          >
            <Download size={16} />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Baixar favoritas
              </span>
              <span className="text-[8px] opacity-80 italic">
                {favorites.length} fotos
              </span>
            </div>
          </button>
        </div>
      )}
      {/* 2. GRID CORRIGIDO PARA VÁRIAS COLUNAS */}
      <div className="w-full max-w-[1600px] mx-auto px-1 md:px-8">
        {showOnlyFavorites && albumPhotos.length === 0 ? (
          <div className="text-center py-20 text-[#D4AF37] italic font-serif text-lg">
            Nenhuma foto favorita selecionada.
          </div>
        ) : (
          <div className="w-full max-w-[1600px] mx-auto px-1 md:px-8">
            <PhotoAlbum
              layout="rows"
              photos={albumPhotos}
              render={{ photo: RenderPhoto }} // Sintaxe correta para v3
              spacing={16}
              targetRowHeight={300} // Diminua para 200 se quiser mais colunas
            />
          </div>
        )}
      </div>
      {/* 3. INFINITE SCROLL INDICATOR */}
      {displayLimit < photos.length && !showOnlyFavorites && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin h-8 w-8 text-[#F3E5AB]" />
        </div>
      )}
      {/* 4. LIGHTBOX */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          galeria={galeria}
          location={galeria.location || ''}
          onClose={() => {
            setSelectedPhotoIndex(null);
            refreshFavorites(); // Força a barra a atualizar ao fechar
          }}
          onNext={() =>
            setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)
          }
          onPrev={() =>
            setSelectedPhotoIndex(
              (selectedPhotoIndex - 1 + photos.length) % photos.length,
            )
          }
        />
      )}
      {/* BOTÃO FLUTUANTE DE DOWNLOAD RÁPIDO */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-4 md:px-4 py-2 md:py-2 rounded-full shadow-[0_10px_40px_rgba(230,126,112,0.4)] transition-all active:scale-95 group border border-white/20"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="font-bold tracking-widest text-sm">
                  A baixar ({Math.round(favDownloadProgress)}%)
                </span>
              </div>
            ) : (
              <>
                <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors">
                  <Download size={18} />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="gap-1.5 text-white text-sm md:text-[14px] font-medium italic">
                    Baixar favoritas
                  </span>
                  <span className="text-[10px] md:text-[12px] opacity-80 italic">
                    {favorites.length}{' '}
                    {favorites.length === 1
                      ? 'foto escolhida'
                      : 'fotos escolhidas'}
                  </span>
                </div>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
