'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Heart } from 'lucide-react';

// Novas importações do PhotoSwipe
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { div } from 'framer-motion/client';
import { Galeria } from '@/types/galeria';
import { getHighResImageUrl, getImageUrl } from '@/utils/url-helper';

interface Photo {
  id: string;
  url: string;
  width: number;
  height: number;
}

interface MasonryGridProps {
  galleryTitle: string;
  galeria: Galeria;
  displayedPhotos: Photo[];
  favorites: string[];
  toggleFavoriteFromGrid: (id: string) => void;
  setSelectedPhotoIndex: (index: number) => void;
  photos: Photo[];
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (value: boolean) => void;
}

const getDownloadFileName = (index: number, galleryTitle: string) => {
  const cleanTitle = galleryTitle.replace(/[^a-zA-Z0-9 ]/g, '');
  const shortTitle = cleanTitle.substring(0, 20).replace(/\s+/g, '-');
  return `foto-${index + 1}-${shortTitle}.jpg`;
};

const MasonryGrid = ({
  galleryTitle,
  galeria,
  displayedPhotos,
  favorites,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  photos,
  showOnlyFavorites,
  setShowOnlyFavorites,
}: MasonryGridProps) => {
  const [displayLimit, setDisplayLimit] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ESTADO PARA CONTROLAR O RODAPÉ
  const allLoaded = showOnlyFavorites || displayLimit >= displayedPhotos.length;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        !isLoading &&
        displayLimit < displayedPhotos.length
      ) {
        setIsLoading(true);
        setTimeout(() => {
          setDisplayLimit((prev) =>
            Math.min(prev + 24, displayedPhotos.length),
          );
          setIsLoading(false);
        }, 800);
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayLimit, displayedPhotos.length, isLoading]);

  const limitedPhotos = displayedPhotos.slice(0, displayLimit);

  return (
    <div className="w-full h-auto">
      {' '}
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-20 text-[#D4AF37] text-[36px]">
          <p className="italic font-serif text-lg">
            Nenhuma foto favorita selecionada.
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="px-8 py-3 rounded-full bg-[#F3E5AB] text-slate-900 font-semibold text-sm md:text-[14px] tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
          >
            Ver todas as fotos
          </button>
        </div>
      ) : (
        <>
          <div className="max-w-[1600px] mx-auto px-4 pt-10">
            {/* Implementação do PhotoSwipe Gallery */}
            <Gallery withCaption>
              <div
                key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
                className={`gap-4 mx-auto ${
                  showOnlyFavorites
                    ? 'flex flex-wrap justify-start items-start align-content-start min-h-[80vh]'
                    : 'columns-1 sm:columns-2 md:columns-3 lg:columns-4'
                }
              `}
              >
                {limitedPhotos.map((photo, index) => {
                  const isSelected = favorites.includes(photo.id);

                  return (
                    <Item
                      key={photo.id}
                      original={getHighResImageUrl(photo.id)}
                      thumbnail={getImageUrl(photo.id, 'w600')}
                      width={photo.width}
                      height={photo.height}
                      caption={`${galleryTitle} - Foto ${index + 1}`}
                    >
                      {({ ref, open }) => (
                        <div
                          className={`relative mb-4 group ${
                            showOnlyFavorites
                              ? 'flex-grow h-[250px] md:h-[300px] w-auto'
                              : 'inline-block w-full break-inside-avoid-column'
                          }`}
                          style={
                            showOnlyFavorites
                              ? {
                                  flexBasis: `${(photo.width * 300) / photo.height}px`,
                                }
                              : {}
                          }
                        >
                          <a
                            href="#"
                            ref={
                              ref as React.MutableRefObject<HTMLAnchorElement>
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              // CHAMA O SEU LIGHTBOX CUSTOMIZADO
                              setSelectedPhotoIndex(index);
                            }}
                            className="block cursor-zoom-in relative rounded-2xl bg-slate-100 z-10"
                          >
                            <div className="absolute inset-0 z-0 flex items-center justify-center animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
                              <div className="w-5 h-5 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                            </div>
                            <Image
                              src={getImageUrl(photo.id, 'w600')}
                              alt={`Foto ${index + 1}`}
                              width={photo.width}
                              height={photo.height}
                              style={{
                                aspectRatio: `${photo.width} / ${photo.height}`,
                              }}
                              className="relative z-10 rounded-2xl w-full h-auto object-cover transition-opacity duration-1000 opacity-0"
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                if (img.complete) {
                                  img.classList.remove('opacity-0');
                                  const skeleton =
                                    img.parentElement?.querySelector(
                                      '.animate-pulse',
                                    );
                                  if (skeleton)
                                    skeleton.classList.add('hidden');
                                }
                              }}
                              unoptimized
                              loading="lazy"
                            />
                          </a>

                          {/* Botões mantidos com z-index alto para clique instantâneo */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavoriteFromGrid(photo.id);
                            }}
                            className={`absolute top-2 left-2 z-[50] w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
                              isSelected
                                ? 'bg-[#E67E70] border-transparent shadow-lg scale-110'
                                : 'bg-black/40 border-white/20 hover:bg-black/60 hover:scale-110'
                            }`}
                          >
                            <Heart
                              size={16}
                              fill={isSelected ? 'white' : 'none'}
                              className="text-white"
                            />
                          </button>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                // 1. Buscamos a imagem via proxy
                                const response = await fetch(
                                  `/api/proxy-image?id=${photo.id}`,
                                );

                                if (!response.ok)
                                  throw new Error('Falha no download');

                                // 2. Convertemos para blob garantindo o tipo MIME
                                const blob = await response.blob();
                                const imageBlob = new Blob([blob], {
                                  type: 'image/jpeg',
                                });

                                // 3. Criamos o link de download
                                const url =
                                  window.URL.createObjectURL(imageBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = getDownloadFileName(
                                  index,
                                  galleryTitle,
                                );

                                // 4. Disparamos o download e limpamos a memória
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error('Erro ao baixar foto:', error);
                                // Fallback: tenta abrir a imagem original em nova aba se o blob falhar
                                window.open(
                                  getHighResImageUrl(photo.id),
                                  '_blank',
                                );
                              }
                            }}
                            className="absolute top-2 right-2 z-[50] w-8 h-8 md:w-10 md:h-10 rounded-full border bg-black/40 border-white/20 flex items-center justify-center hover:scale-110 transition-all pointer-events-auto cursor-pointer"
                          >
                            <Download size={16} className="text-white" />
                          </button>

                          {isSelected && !showOnlyFavorites && (
                            <div className="absolute inset-0 border-2 border-[#E67E70] rounded-2xl pointer-events-none z-20" />
                          )}
                        </div>
                      )}
                    </Item>
                  );
                })}
              </div>
            </Gallery>
          </div>
          {/* AJUSTE: Mova o espaçador para fora da div anterior para garantir que ele ocupe a largura total e altura real */}
          {showOnlyFavorites && (
            <div
              className="w-full h-32 md:h-60 clear-both"
              style={{ minHeight: '150px' }} // Força uma altura mínima garantida
              aria-hidden="true"
            />
          )}
          {isLoading && !showOnlyFavorites && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-[#F3E5AB]/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#F3E5AB] animate-spin" />
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[#F3E5AB]/60 font-medium">
                Carregando memórias
              </p>
            </div>
          )}
          {/* Sentinela movido para o final */}
          {!allLoaded && <div ref={sentinelRef} className="h-20 w-full" />}

          {/* RENDERIZAÇÃO CONDICIONAL DO RODAPÉ */}
          {allLoaded && !showOnlyFavorites && (
            <footer className="relative z-20 w-full mt-4 pt-6 border-t border-[#D4AF37]/20 bg-[#FFF9F0]">
              <div className="max-w-[1600px] mx-auto flex flex-col items-center gap-10">
                {/* 1. Botão Voltar ao Topo Minimalista */}
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                  className="group flex flex-col items-center gap-2 transition-all duration-500"
                >
                  <div className="p-3 rounded-full border border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-all">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </div>
                  <span className="text-[9px] md:text-[14px] tracking-[0.4em]  font-medium text-[#D4AF37]">
                    Topo
                  </span>
                </button>

                {/* 2. Bloco Central Editorial (Compactado) */}
                <div className="text-center space-y-2">
                  <h3 className="font-serif italic text-2xl md:text-4xl text-slate-900 tracking-tight">
                    {galleryTitle}
                  </h3>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] md:text-[12px] tracking-[0.2em] uppercase text-[#D4AF37]/80 font-semibold">
                      Memórias Eternizadas
                    </p>
                    <p className="text-slate-500 font-serif italic text-sm md:text-base">
                      por{' '}
                      <span className="text-slate-900 font-semibold not-italic">
                        {galeria?.photographer_name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Barra de Conexão e Créditos (Espaçamento Nobre) */}
                <div className="w-full border-t border-slate-200/60 mt-4 pt-4 pb-10 px-8 md:px-16">
                  <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                    {/* Lado Esquerdo: Redes e Perfil */}
                    <div className="flex items-center gap-5">
                      <span className="text-[10px] md:text-[12px]  tracking-[0.2em] font-bold text-slate-800 font-sans uppercase">
                        Conectar ao fotógrafo
                      </span>
                      <div className="flex items-center gap-3">
                        {galeria.photographer_phone && (
                          <a
                            href={`https://wa.me/${galeria.photographer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            className="p-2 text-slate-700 hover:text-[#25D366] transition-all"
                          >
                            <svg
                              width="18"
                              height="18"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        )}
                        {galeria.photographer_instagram && (
                          <a
                            href={`https://instagram.com/${galeria.photographer_instagram.replace('@', '')}`}
                            target="_blank"
                            className="p-2 text-slate-700 hover:text-slate-900 transition-all"
                          >
                            <svg
                              width="18"
                              height="18"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                          </a>
                        )}
                        {/* ACESSO AO PERFIL REINTEGRADO */}
                        <a
                          href={`/${galeria.photographer_id}`}
                          target="_blank"
                          className="p-2 text-slate-700 hover:text-[#D4AF37] transition-all border border-transparent hover:border-[#D4AF37]/20 rounded-full"
                        >
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Lado Direito: Branding Inter-font */}
                    <div className="flex flex-col items-center md:items-end gap-1 text-slate-600">
                      <div className="text-[10px] md:text-[12px]  tracking-[0.2em] font-bold text-slate-800 font-sans uppercase">
                        Powered by{' '}
                        <span className="text-[#D4AF37] font-serif italic tracking-normal text-xs md:text-sm ml-1">
                          Sua Galeria
                        </span>
                      </div>
                      <div className="text-[10px] md:text-[12px] tracking-widest font-sans font-medium">
                        © {new Date().getFullYear()} — Todos os direitos
                        reservados
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  );
};

export default MasonryGrid;
