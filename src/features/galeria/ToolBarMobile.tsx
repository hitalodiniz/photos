'use client';
import React, { useState, useEffect } from 'react';
import {
  Filter,
  Download,
  Tag,
  Monitor,
  Link as LinkIcon,
  Check,
  FileCheck,
  Zap,
  Share2,
} from 'lucide-react';

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

// Componente do Balão de Dica (Padronizado para mobile)
// Fontes padronizadas: text-[9px] font-semibold (mesmo padrão do ToolbarGalleryView)
const Tooltip = ({
  text,
  position = 'center',
}: {
  text: string;
  position?: 'left' | 'right' | 'center';
}) => {
  // Posicionamento do container do tooltip
  // Para tooltips à esquerda, usamos left-0 mas garantimos que o container pai tenha overflow-visible
  const containerClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  // Posicionamento da seta dentro do tooltip
  const arrowClasses = {
    left: 'left-3',
    right: 'right-3',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`absolute -bottom-11 ${containerClasses[position]} z-[130] animate-in fade-in zoom-in slide-in-from-top-2 duration-500 pointer-events-none`}
      style={{
        // Garante que tooltips à esquerda não cortem na borda da tela
        ...(position === 'left' && { 
          left: '0',
          // Adiciona um pequeno offset para não cortar na borda esquerda da viewport
          transform: 'translateX(0)',
        }),
      }}
    >
      <div className="bg-gold text-black text-[9px] font-bold px-2.5 py-1.5 rounded-luxury shadow-2xl whitespace-nowrap relative ring-1 ring-black/10 uppercase tracking-luxury">
        {text}
        {/* Seta apontando para cima - sempre visível e bem posicionada */}
        <div
          className={`absolute -top-1 ${arrowClasses[position]} w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-gold`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export const ToolBarMobile = ({
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isDownloading,
  isScrolled,
  activeTag,
  setActiveTag,
  columns,
  setColumns,
  tags = [],
  handleShare,
  galeria,
  handleExternalDownload,
}: any) => {
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hintStep, setHintStep] = useState(0);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [linksStatus, setLinksStatus] = useState<Record<number, boolean>>({});

  const externalLinks = parseLinks(galeria?.zip_url_full);

  // Valida links externos
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

  const hasMultipleTags = tags.length > 1;

  // Ciclo de dicas de ajuda (Hints) - Ordem: Categorias, Layout, Compartilhar, Link, Favoritos, Baixar
  useEffect(() => {
    const timers = [
      setTimeout(() => hasMultipleTags && setHintStep(1), 5800), // 1. Categorias
      setTimeout(() => setHintStep(2), 7300), // 2. Layout
      setTimeout(() => setHintStep(3), 8800), // 3. Compartilhar
      setTimeout(() => setHintStep(4), 10300), // 4. Link
      setTimeout(() => setHintStep(5), 11800), // 5. Favoritos
      setTimeout(() => setHintStep(6), 13300), // 6. Baixar
      setTimeout(() => setHintStep(0), 17000), // Limpa
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, [hasMultipleTags]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🎯 Função para compartilhamento nativo no mobile (Web Share API)
  const handleNativeShare = async () => {
    const shareText = galeria?.title 
      ? `Confira a galeria: ${galeria.title}`
      : 'Confira esta galeria de fotos';

    // Verifica se a Web Share API está disponível
    if (navigator.share) {
      try {
        await navigator.share({
          title: galeria?.title || 'Galeria de Fotos',
          text: shareText,
        });
      } catch (error) {
        // Usuário cancelou ou erro no compartilhamento
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          // Fallback: copia o link para a área de transferência
          handleCopyLink();
        }
      }
    } else {
      // Fallback: se não suportar Web Share API, usa a função handleShare original
      if (handleShare) {
        handleShare();
      } else {
        // Se não houver handleShare, copia o link
        handleCopyLink();
      }
    }
  };

  const togglePanel = (panel: string) => {
    setShowTagsPanel(panel === 'tags' ? !showTagsPanel : false);
    setShowColumnsPanel(panel === 'columns' ? !showColumnsPanel : false);
    setHintStep(0);
  };

  return (
    <div className="w-full z-[110] sticky top-0 md:hidden pointer-events-auto overflow-visible">
      <div
        className={`flex items-center justify-between h-14 px-4 border-b transition-all duration-500 relative z-[120] overflow-visible
        ${isScrolled ? ' bg-petroleum/95 backdrop-blur-md border-white/10 shadow-lg' : ' bg-petroleum border-white/20'}`}
      >
        {/* ESQUERDA: TAGS E COLUNAS */}
        <div className="flex items-center gap-2 overflow-visible">
          {hasMultipleTags && (
            <div className="relative overflow-visible">
              <button
                className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all ${showTagsPanel ? 'bg-gold text-black' : 'bg-white/5 text-gold border border-white/10'}`}
                onClick={() => togglePanel('tags')}
              >
                <Tag size={16} />
              </button>
              {hintStep === 1 && <Tooltip text="Categorias" position="left" />}
            </div>
          )}

          <div className="relative overflow-visible">
            <button
              className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all ${showColumnsPanel ? 'bg-gold text-black' : 'bg-white/5 text-gold border border-white/10'}`}
              onClick={() => togglePanel('columns')}
            >
              <Monitor size={17} />
            </button>
            {hintStep === 2 && (
              <Tooltip text="Layout" position="left" />
            )}
          </div>
        </div>

        {/* DIREITA: AÇÕES (COMPARTILHAR, LINK, FAVORITOS, DOWNLOAD) */}
        <div className="flex items-center gap-1.5 overflow-visible">
          <div className="relative overflow-visible">
            <button
              onClick={handleNativeShare}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-white/5 text-white border border-white/10 active:bg-white/10"
            >
              <Share2 size={18} />
            </button>
            {hintStep === 3 && <Tooltip text="Compartilhar" position="center" />}
          </div>

          <div className="relative overflow-visible">
            <button
              onClick={handleCopyLink}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-white/5 text-white border border-white/10 active:bg-white/10"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <LinkIcon size={16} />
              )}
            </button>
            {hintStep === 4 && <Tooltip text="Copiar Link" position="center" />}
          </div>

          <div className="relative overflow-visible">
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`w-9 h-9 rounded-luxury flex items-center justify-center transition-all border ${showOnlyFavorites ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white/5 border-white/10 text-white'}`}
            >
              <Filter size={15} />
            </button>
            {hintStep === 5 && <Tooltip text="Favoritos" position="center" />}
          </div>

          <div className="relative overflow-visible pl-1.5 border-l border-white/10 ml-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDownloadMenu(!showDownloadMenu);
              }}
              disabled={isDownloading}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-gold text-black active:scale-90 shadow-xl transition-all"
            >
              {isDownloading ? (
                <div className="loading-luxury w-4 h-4 border-black/30 border-t-black" />
              ) : (
                <Download size={16} />
              )}
            </button>
            {hintStep === 6 && (
              <Tooltip text="Baixar" position="right" />
            )}

            {/* 🎯 MENU DE DOWNLOAD MOBILE (ABRE PARA BAIXO) */}
            {showDownloadMenu && (
              <>
                {/* Overlay para fechar ao clicar fora */}
                <div
                  className="fixed inset-0 z-[190]"
                  onClick={() => setShowDownloadMenu(false)}
                />

                <div className="absolute top-full mt-3 right-0 w-[75vw] max-w-[280px] bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-luxury shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[200] overflow-hidden">
                  <div className="p-1.5 flex flex-col gap-1">
                    {/* Opção 1: Fotos Otimizadas (Abre a Central de Volumes) */}
                    <button
                      onClick={() => {
                        downloadAllAsZip(); // Abre a central que já configuramos
                        setShowDownloadMenu(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-luxury bg-white/5 active:bg-white/10 text-left"
                    >
                      <Zap size={18} className="text-gold shrink-0" />
                      <div>
                        <p className="text-white text-editorial-label">
                          Fotos Otimizadas
                        </p>
                        <p className="text-white/40 text-[9px] leading-tight font-medium italic">
                          Ideal para celular e postagens.
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
                          className="flex items-center gap-3 p-3 rounded-luxury bg-white/5 active:bg-white/10 text-left border-t border-white/5"
                        >
                          <FileCheck
                            size={18}
                            className="text-gold shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-editorial-label">
                              {externalLinks.length === 1 
                                ? 'Qualidade Máxima'
                                : `Link ${index + 1} - Alta Resolução`}
                            </p>
                            <p className="text-white/40 text-[9px] leading-tight truncate italic font-medium">
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

      {/* PAINÉIS DE EXPANSÃO (TAGS E COLUNAS) */}
      <div className="absolute top-full left-0 w-full z-[115]">
        <div
          className={`overflow-hidden transition-all duration-500 bg-petroleum/95 backdrop-blur-xl border-b border-white/10 ${showColumnsPanel ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex items-center justify-center gap-4 h-14">
            {[1, 2].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setColumns((prev: any) => ({ ...prev, mobile: num }));
                  setShowColumnsPanel(false);
                }}
                className={`px-6 py-2 rounded-luxury text-editorial-label transition-all border ${columns.mobile === num ? 'bg-gold text-black border-gold shadow-lg' : 'bg-white/5 text-white border border-white/10'}`}
              >
                {num} {num === 1 ? 'Coluna' : 'Colunas'}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 bg-petroleum/95 backdrop-blur-xl border-b border-white/10 ${showTagsPanel ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="p-6 flex flex-col gap-4">
            <span className="text-editorial-label text-white/40">
              Categorias
            </span>
            <div className="flex flex-wrap gap-2 pb-2">
              {tags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(tag);
                    setShowTagsPanel(false);
                  }}
                  className={`px-4 py-2 rounded-luxury text-editorial-label transition-all border ${activeTag === tag ? 'bg-gold text-black border-gold shadow-lg' : 'bg-white/5 text-white border border-white/10'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
