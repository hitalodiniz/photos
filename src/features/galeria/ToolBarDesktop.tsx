'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Download,
  Loader2,
  ChevronDown,
  Monitor,
  Tag,
  Link as LinkIcon,
  Check,
  Wand2,
  Zap,
  FileCheck,
  ImageIcon,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

// 🎯 Função helper para parsear links do JSON
const parseLinks = (jsonString: string | null | undefined): string[] => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.filter((link) => link && typeof link === 'string');
    }
    // Se não é array, trata como string única (compatibilidade)
    return jsonString ? [jsonString] : [];
  } catch {
    // Se não é JSON válido, trata como string única (compatibilidade)
    return jsonString ? [jsonString] : [];
  }
};

export const ToolBarDesktop = ({
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,

  isDownloading,
  activeTag,
  setActiveTag,
  columns,
  setColumns,
  tags = [],
  handleShare,
  handleExternalDownload,
  galeria,
}: any) => {
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [linksStatus, setLinksStatus] = useState<Record<number, boolean>>({});

  const externalLinks = parseLinks(galeria?.zip_url_full);

  const isCompact = false;
  const hasTags = tags.length > 1;

  useEffect(() => {
    if (isCompact) setShowDownloadMenu(false);
  }, [isCompact]);

  /*
   * Pergunta ao servidor se os links de download externos são válidos
   */
  useEffect(() => {
    const validateLinks = async () => {
      const check = async (url: string) => {
        try {
          const res = await fetch(
            `/api/validate-link?url=${encodeURIComponent(url)}`,
          );
          const data = await res.json();
          return data.valid;
        } catch {
          return false;
        }
      };

      const status: Record<number, boolean> = {};
      const links = parseLinks(galeria?.zip_url_full);

      // Valida cada link do array
      for (let i = 0; i < links.length; i++) {
        status[i] = await check(links[i]);
      }

      setLinksStatus(status);
    };

    validateLinks();
  }, [galeria?.zip_url_full]);
  const { visibleTags, hiddenTags } = useMemo(() => {
    const limit = 4;
    let sortedTags = [...tags];

    if (activeTag && activeTag !== '' && activeTag !== 'Todas') {
      sortedTags = [activeTag, ...tags.filter((t) => t !== activeTag)];
    }

    return {
      visibleTags: sortedTags.slice(0, limit),
      hiddenTags: sortedTags.slice(limit),
    };
  }, [tags, activeTag]);

  return (
    <div className="hidden md:block z-[100] sticky top-0 w-full pointer-events-none">
      <div
        className={`
        mx-auto transition-all duration-500 ease-out
        pointer-events-auto relative
        w-full bg-petroleum/95 backdrop-blur-md border-b border-white/10 shadow-2xl
        /* 🎯 FIX DOWNLOAD: Permite que o menu suspenso apareça para baixo */
        ${showDownloadMenu ? 'overflow-visible' : 'overflow-hidden'}
      `}
      >
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-14 mx-auto min-w-0">
          {/* 1. FERRAMENTAS + COLUNAS */}
          <div className="flex items-center gap-4 border-r border-white/10 pr-4 shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 size={18} className="text-gold" />
              <span className="text-editorial-label text-white/70 hidden lg:block">
                Ferramentas
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-luxury px-1.5 h-10 border border-white/10 shadow-inner">
              <Monitor size={14} className="text-gold mx-1" />
              {[3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() =>
                    setColumns((p: any) => ({ ...p, desktop: num }))
                  }
                  className={`w-7 h-7 rounded-luxury text-[10px] font-bold transition-all ${
                    columns.desktop === num
                      ? 'bg-gold text-black shadow-lg'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 2. MEIO: CATEGORIAS/TAGS (SÓ APARECE SE TIVER MAIS DE UMA) */}
          {hasTags ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center shrink-0 ml-2">
                <Tag size={16} className="text-gold" />
              </div>
              <nav className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth">
                {visibleTags.map((tag: string) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
                    className={`px-4 py-1.5 rounded-luxury text-editorial-label transition-all shrink-0 border h-9 ${
                      activeTag === tag
                        ? 'bg-gold text-black border-gold shadow-lg'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </nav>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* 3. AÇÕES */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center justify-center rounded-luxury h-10 border transition-all duration-300 w-28 gap-2 ${
                showOnlyFavorites
                  ? 'bg-red-600 border-red-600 text-white shadow-lg'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Filter size={16} />
              <span className="text-editorial-label">
                Favoritos
              </span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white/60 hover:bg-green-600 hover:text-white transition-all w-28 gap-2"
            >
              <WhatsAppIcon className="text-current w-[16px] h-[16px]" />
              <span className="text-editorial-label">
                Whatsapp
              </span>
            </button>

            {/* BOTÃO LINK / COPIAR RESTAURADO */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white/60 hover:bg-white hover:text-black transition-all w-24 gap-2"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <LinkIcon size={16} />
              )}
              <span className="text-editorial-label">
                Link
              </span>
            </button>

            {/* ÁREA DO DOWNLOAD SUSPENSO (ABRE PARA BAIXO) */}
            <div className="relative">
              <div className="relative pl-2 border-l border-white/10 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDownloadMenu(!showDownloadMenu);
                  }}
                  disabled={isDownloading}
                  className="flex items-center justify-center rounded-luxury bg-gold text-black h-10 font-bold shadow-xl hover:bg-white transition-all disabled:opacity-50 w-32 gap-2 px-4"
                >
                  {isDownloading ? (
                    <div className="loading-luxury w-4 h-4 border-black/30 border-t-black" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span className="text-editorial-label">
                    Baixar
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${showDownloadMenu ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {showDownloadMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[190]"
                    onClick={() => setShowDownloadMenu(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-luxury shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[200] pointer-events-auto overflow-hidden">
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          downloadAllAsZip();
                          setShowDownloadMenu(false);
                        }}
                        className="flex items-start gap-3 p-3 rounded-luxury hover:bg-white/10 transition-all text-left group"
                      >
                        <Zap size={18} className="text-gold mt-0.5" />
                        <div>
                          <p className="text-white text-editorial-label">
                            Fotos Otimizadas
                          </p>
                          <p className="text-white/40 text-[10px] leading-tight font-medium italic">
                            Até 2MB por foto. Ideal para celular.
                          </p>
                        </div>
                      </button>

                      {/* Links Externos - Múltiplos links do JSON */}
                      {externalLinks.map((link, index) => {
                        // Só exibe se o link for válido/on-line
                        if (!linksStatus[index]) return null;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setShowDownloadMenu(false);
                              handleExternalDownload(
                                link,
                                `${galeria.title}_Link_${index + 1}.zip`,
                              );
                            }}
                            className="w-full flex items-start gap-3 p-3 rounded-luxury hover:bg-white/10 transition-all text-left group border-t border-white/5"
                          >
                            <FileCheck
                              size={18}
                              className="text-gold mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-editorial-label">
                                {externalLinks.length === 1 
                                  ? 'Qualidade Máxima'
                                  : `Link ${index + 1} - Alta Resolução`}
                              </p>
                              <p className="text-white/40 text-[10px] leading-tight truncate italic font-medium">
                                {link}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
