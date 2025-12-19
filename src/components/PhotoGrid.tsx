'use client';
import React, { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import Lightbox from './Lightbox';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Camera, Image as ImageIcon, Calendar, MapPin, Download } from 'lucide-react';

interface PhotoGridProps {
  photos: any[];
  galeria: {
    title: string;
    date: string;
    location?: string;
    is_public: boolean;
  };
}

export default function PhotoGrid({ photos, galeria }: PhotoGridProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const MAX_PHOTOS = 150; // Limite sugerido para estabilidade no mobile
  const isOverLimit = photos.length > MAX_PHOTOS;
  // 1. Cálculo da estimativa (Mantenha 6MB se não tiver o dado real da API)
  const ESTIMATED_MB_PER_PHOTO = 10;
  const totalSizeMB = photos.length * ESTIMATED_MB_PER_PHOTO;
  const isVeryHeavy = totalSizeMB > 500;


  // Configuração de colunas do Masonry
  const breakpointColumnsObj = {
    default: 3,
    1100: 3,
    700: 2,
    500: 1
  };

  // Helper para URL (w400 para grid, s0 para original/ZIP)
  const getImageUrl = (photoId: string, suffix: string = "w400") => {
    return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
  };

  // Lógica de Download em ZIP
  const downloadAllAsZip = async () => {
    if (isOverLimit || isDownloading) return;



    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const zip = new JSZip();

      // REMOVEMOS a linha: const folder = zip.folder(...);
      // Vamos adicionar direto no objeto 'zip' para os arquivos ficarem na raiz.

      const downloadPromises = photos.map(async (photo, index) => {
        const fileId = typeof photo === 'string' ? photo : photo.id;

        // ✅ CORREÇÃO CRÍTICA: Uso do ${fileId} com crase e símbolo de cifrão
        const url = `https://lh3.googleusercontent.com/u/0/d/${fileId}=s0`;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Erro na rede");
          const blob = await response.blob();

          // Nome do arquivo (garantindo que tenha .jpg)
          const fileName = `foto-${index + 1}.jpg`;

          // ✅ ADICIONA DIRETO NA RAIZ DO ZIP
          zip.file(fileName, blob);

          setDownloadProgress((prev) => prev + (100 / photos.length));
        } catch (err) {
          console.error(`Erro ao processar foto ${index}:`, err);
        }
      });

      await Promise.all(downloadPromises);

      // Verifica se o ZIP contém arquivos antes de gerar
      const zipFiles = Object.keys(zip.files);
      if (zipFiles.length === 0) {
        alert("Nenhum arquivo pôde ser baixado. Verifique as permissões das fotos.");
        return;
      }

      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE"
      });

      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_alta_res.zip`);

    } catch (error) {
      console.error("Erro no ZIP:", error);
      alert("Houve um problema ao gerar o seu arquivo ZIP.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        setDisplayLimit((prev) => Math.min(prev + 12, photos.length));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos.length]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center gap-12">

      {/* BARRA DE INFORMAÇÕES (Champanhe) */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 
      md:gap-6 bg-black/45 backdrop-blur-lg p-5 md:p-2.5 md:px-6 rounded-[2.5rem] md:rounded-full border border-white/10 
      shadow-2xl inline-flex w-auto max-w-[95%] md:max-w-max mx-auto transition-all mt-14 md:mt-2">

        {/* GRUPO 1: Status e Fotos */}
        <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
          <div className="flex items-center gap-2">
            <Camera className="text-[#F3E5AB] w-4 h-4" />
            <span className="whitespace-nowrap  tracking-widest text-[10px] md:text-xs">
              {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <ImageIcon size={14} className="text-[#F3E5AB]" />
            <span className="whitespace-nowrap italic">{photos.length} fotos</span>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-4 bg-white/20"></div>

        {/* GRUPO 2: Data e Local */}
        <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Calendar size={14} className="text-[#F3E5AB]" />
            {new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {galeria.location && (
            <span className="flex items-center gap-2 border-l border-white/20 pl-4 whitespace-nowrap max-w-[120px] md:max-w-[300px] truncate">
              <MapPin size={14} className="text-[#F3E5AB]" /> {galeria.location}
            </span>
          )}
        </div>

        {/* Botão de Download */}
        {/* Botão de Download com Validação Visual */}
        {/* Container com controle de visibilidade para Mobile e Desktop */}
        <div className="relative group flex flex-col items-center w-full md:w-auto">

          {/* BALÃO INFORMATIVO (Tooltip) 
      group-hover:opacity-100 -> Computador
      group-active:opacity-100 -> Mobile (ao manter pressionado ou clicar)
  */}
          {(isVeryHeavy || isOverLimit) && !isDownloading && (
            <div className="absolute bottom-full mb-3 flex flex-col items-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-active:opacity-100 translate-y-2 group-hover:translate-y-0 pointer-events-none z-50">
              <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-xl shadow-2xl">
                <p className="text-[10px] md:text-[11px] leading-tight text-center whitespace-nowrap">
                  {isOverLimit ? (
                    <span className="text-red-400 font-bold block mb-0.5">LIMITE EXCEDIDO</span>
                  ) : (
                    <span className="text-[#F3E5AB] font-bold block mb-0.5">ARQUIVO GRANDE</span>
                  )}
                  <span className="text-white/70 italic font-light">
                    Tamanho estimado: {Math.round(totalSizeMB)}MB
                  </span>
                </p>
              </div>
              {/* Triângulo do balão */}
              <div className="w-2.5 h-2.5 bg-slate-900/95 rotate-45 -mt-1.5 border-r border-b border-white/10"></div>
            </div>
          )}

          {/* BOTÃO CHAMPANHE */}
          <button
            onClick={downloadAllAsZip}
            disabled={isDownloading || isOverLimit}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:py-2 rounded-xl font-bold 
              transition-all shadow-lg active:scale-95 text-xs md:text-sm tracking-widest md:ml-2 whitespace-nowrap
            ${isOverLimit
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-white/10'
                : 'bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900'
              } ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                <span className="tabular-nums">Processando {Math.round(downloadProgress)}%</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>
                  {isOverLimit ? 'Download Bloqueado' : `Baixar todas ${isVeryHeavy ? '*' : ''}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GRID MASONRY */}
      <div className="w-full">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {photos.slice(0, displayLimit).map((photo, index) => (
            <div
              key={photo.id || index}
              onClick={() => setSelectedPhotoIndex(index)}
              className="relative group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-2xl transition-all duration-500 cursor-zoom-in mb-4 animate-in fade-in zoom-in-95 duration-700"
            >
              <img
                src={getImageUrl(photo.id, "w400")}
                alt="Foto"
                className="w-full h-auto object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            </div>
          ))}
        </Masonry>
      </div>

      {/* Indicador de carregamento do Infinite Scroll */}
      {displayLimit < photos.length && (
        <div className="flex justify-center py-10 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F3E5AB]"></div>
        </div>
      )}

      {/* Verificação robusta no PhotoGrid */}
      {selectedPhotoIndex !== null && photos && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          location={galeria.location || ""}
          onClose={() => setSelectedPhotoIndex(null)}
          onNext={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)}
          onPrev={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length)}
        />
      )}
    </div>
  );
}