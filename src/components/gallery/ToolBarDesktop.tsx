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
import WhatsAppIcon from '../ui/WhatsAppIcon';

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
  const [linksStatus, setLinksStatus] = useState({
    full: false,
    social: false,
  });

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

      const status = { full: false, social: false };

      if (galeria?.zip_url_full) {
        status.full = await check(galeria.zip_url_full);
      }
      if (galeria?.zip_url_social) {
        status.social = await check(galeria.zip_url_social);
      }

      setLinksStatus(status);
    };

    validateLinks();
  }, [galeria?.zip_url_full, galeria?.zip_url_social]);
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
        w-full bg-[#1E293B]/95 backdrop-blur-md border-b border-white/10 shadow-2xl
        /* 🎯 FIX DOWNLOAD: Permite que o menu suspenso apareça para baixo */
        ${showDownloadMenu ? 'overflow-visible' : 'overflow-hidden'}
      `}
      >
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-14 mx-auto min-w-0">
          {/* 1. FERRAMENTAS + COLUNAS */}
          <div className="flex items-center gap-4 border-r border-white/10 pr-4 shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 size={18} className="text-[#F3E5AB]" />
              <span className="text-[10px] text-white/70 uppercase font-semibold tracking-widest hidden lg:block">
                Ferramentas
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-[0.5rem] px-1.5 h-10 border border-white/10">
              <Monitor size={14} className="text-[#F3E5AB] mx-1" />
              {[3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() =>
                    setColumns((p: any) => ({ ...p, desktop: num }))
                  }
                  className={`w-7 h-7 rounded-[0.2rem] text-[10px] font-semibold transition-all ${
                    columns.desktop === num
                      ? 'bg-[#F3E5AB] text-black'
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
                <Tag size={16} className="text-[#F3E5AB]" />
              </div>
              <nav className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth">
                {visibleTags.map((tag: string) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
                    className={`px-4 py-1.5 rounded-[0.5rem] text-[11px] font-semibold uppercase transition-all shrink-0 border h-9 ${
                      activeTag === tag
                        ? 'bg-[#F3E5AB] text-black border-[#F3E5AB]'
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
              className={`flex items-center justify-center rounded-[0.5rem] h-10 border transition-all duration-300 w-28 gap-2 ${
                showOnlyFavorites
                  ? 'bg-[#E67E70] border-[#E67E70] text-white shadow-lg'
                  : 'bg-[#1A1A1A] border-white/10 text-white'
              }`}
            >
              <Filter size={16} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                Favoritos
              </span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-[#25D366] transition-all w-28 gap-2"
            >
              <WhatsAppIcon className="text-white w-[16px] h-[16px]" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
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
              className="flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-white hover:text-black transition-all w-24 gap-2"
            >
              {copied ? (
                <Check size={16} className="text-[#25D366]" />
              ) : (
                <LinkIcon size={16} />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wide">
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
                  className="flex items-center justify-center rounded-[0.5rem] bg-[#F3E5AB]  text-black h-10 font-bold shadow-xl hover:bg-white transition-all disabled:opacity-50 w-32 gap-2 px-4"
                >
                  {isDownloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span className="text-[11px] uppercase tracking-wide">
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
                  <div className="absolute top-full mt-2 right-0 w-72 bg-[#1E293B] border border-white/20 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[200] pointer-events-auto overflow-hidden">
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          downloadAllAsZip();
                          setShowDownloadMenu(false);
                        }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-left group"
                      >
                        <Zap size={18} className="text-[#F3E5AB] mt-0.5" />
                        <div>
                          <p className="text-white text-[11px] font-bold uppercase tracking-tight">
                            Fotos Otimizadas
                          </p>
                          <p className="text-white/50 text-[10px] leading-tight">
                            Até 2MB por foto. Ideal para celular.
                          </p>
                        </div>
                      </button>

                      {/* Opção 2: Alta Definição - Só aparece se o link for válido/on-line */}
                      {galeria?.zip_url_full && linksStatus.full && (
                        <button
                          onClick={() => {
                            setShowDownloadMenu(false);
                            handleExternalDownload(
                              galeria.zip_url_full,
                              `${galeria.title}_Alta_Definicao.zip`,
                            );
                          }}
                          className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-left group border-t border-white/5"
                        >
                          <FileCheck
                            size={18}
                            className="text-[#D4AF37] mt-0.5"
                          />
                          <div>
                            <p className="text-white text-[11px] font-bold uppercase tracking-tight">
                              Qualidade Máxima
                            </p>
                            <p className="text-white/50 text-[10px] leading-tight">
                              Arquivo original enviado pelo autor.
                            </p>
                          </div>
                        </button>
                      )}

                      {/* Opção 3: Social - Só aparece se o link for válido/on-line */}
                      {galeria?.zip_url_social && linksStatus.social && (
                        <button
                          onClick={() => {
                            setShowDownloadMenu(false);
                            handleExternalDownload(
                              galeria.zip_url_social,
                              `${galeria.title}_Social.zip`,
                            );
                          }}
                          className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-left group border-t border-white/5"
                        >
                          <ImageIcon
                            size={18}
                            className="text-blue-400 mt-0.5"
                          />
                          <div>
                            <p className="text-white text-[11px] font-bold uppercase tracking-tight">
                              Versão Redes Sociais
                            </p>
                            <p className="text-white/50 text-[10px] leading-tight">
                              Compactado para Instagram/WhatsApp.
                            </p>
                          </div>
                        </button>
                      )}
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
