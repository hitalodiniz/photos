'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MessageCircle, Loader2, Camera, MapPin, Heart, FolderDown } from 'lucide-react';
import PhotographerAvatar from './PhotographerAvatar'; // Importação do componente
import type { Galeria } from '@/types/galeria';

interface Photo {
    id: string | number;
}

interface LightboxProps {
    photos: Photo[];
    activeIndex: number;
    totalPhotos: number;
    galleryTitle: string;
    location: string;
    galeria: Galeria;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function Lightbox({
    photos,
    activeIndex,
    totalPhotos,
    galleryTitle,
    location,
    galeria,
    onClose,
    onNext,
    onPrev
}: LightboxProps) {
    const [showHint, setShowHint] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const minSwipeDistance = 50;

    // Lógica de Swipe
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance) onNext();
        else if (distance < -minSwipeDistance) onPrev();
    };

    // 1. Defina o estado de favoritos no topo do componente
    const [favorites, setFavorites] = useState<string[]>([]);

    // 2. Carregar favoritos do dispositivo (localStorage)
    useEffect(() => {
        const saved = localStorage.getItem(`fav_${galeria.id}`);
        if (saved) setFavorites(JSON.parse(saved));
    }, [galeria.id]);

    // 3. CORREÇÃO DO ERRO: Use activeIndex em vez de index
    const currentPhotoId = photos[activeIndex]?.id;
    const isFavorited = favorites.includes(currentPhotoId);
    // Contador de quantos favoritos existem no total nesta galeria
    const totalFavorites = favorites.length;

    // 4. Função para favoritar/desfavoritar
    const toggleFavorite = () => {
        if (!currentPhotoId) return;

        // Verifica se é a PRIMEIRA vez que o usuário interage com favoritos nesta galeria
        //const hasHistory = localStorage.getItem(`fav_${galeria.id}`);

        //if (!hasHistory && !isFavorited) {
        setShowHint(true);
        // O balão some automaticamente após 6 segundos
        setTimeout(() => setShowHint(false), 2000);
        //}

        const newFavs = isFavorited
            ? favorites.filter(id => id !== currentPhotoId)
            : [...favorites, currentPhotoId];

        setFavorites(newFavs);
        localStorage.setItem(`fav_${galeria.id}`, JSON.stringify(newFavs));
    };

    const handleDownloadFavorites = async () => {
        // Filtra as fotos da galeria que estão nos favoritos
        const toDownload = photos.filter(p => favorites.includes(p.id));

        if (toDownload.length === 0) return;

        // Dispara o download individual de cada uma (o navegador pode pedir permissão para múltiplos arquivos)
        for (const photo of toDownload) {
            const link = document.createElement('a');
            link.href = photo.url_high_res || photo.url;
            link.download = `foto-${photo.id}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Pequeno atraso para não travar o browser
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    };

    // Proteção de dados
    if (!photos || !photos[activeIndex]) return null;
    const photo = photos[activeIndex];

    // CORREÇÃO CRÍTICA: Adicionado o "$" para interpolação correta da variável
    const getImageUrl = (photoId: string | number, suffix: string = "w1000") =>
        `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;


    const getHighResImageUrl = (photoId: string | number) =>
        `https://lh3.googleusercontent.com/d/${photoId}=s0`;

    const currentUrl = getImageUrl(photo.id);

    // Pre-load e Scroll lock
    useEffect(() => {
        setIsImageLoading(true);
        if (activeIndex + 1 < photos.length) {
            const nextImg = new Image();
            nextImg.src = getImageUrl(photos[activeIndex + 1].id);
        }
    }, [activeIndex, photos]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, onNext, onPrev]);

    const handleShareWhatsApp = async () => {
        // Limpeza para evitar a barra extra que causava erro no banco
        const rawSlug = galeria.slug || "";
        const cleanedSlug = rawSlug.startsWith('/') ? rawSlug.substring(1) : rawSlug;

        // URL Editorial: hitalodiniz/2025/10/25/casamento/ID_DA_FOTO
        const shareUrl = `${window.location.origin}/photo/${photo.id}?s=${cleanedSlug}`;

        const shareText = `Confira esta foto exclusiva: ${galleryTitle}`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                // Compartilhamento nativo com o arquivo da foto
                const response = await fetch(getHighResImageUrl(photo.id));
                const blob = await response.blob();
                const file = new File([blob], "foto.jpg", { type: "image/jpeg" });

                await navigator.share({
                    files: [file],
                    title: galleryTitle,
                    text: `${shareText}\n\nLink: ${shareUrl}`
                });
                return;
            } catch (e) {
                console.error("Erro no Share nativo:", e);
            }
        }

        // Fallback: Link direto
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
        window.open(whatsappUrl, '_blank');
    };
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const highResUrl = getHighResImageUrl(photo.id);
            const response = await fetch(highResUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${galleryTitle.replace(/\s+/g, '_')}_foto_${activeIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) { window.open(getHighResImageUrl(photo.id), '_blank'); }
        finally { setIsDownloading(false); }
    };

    return (
        <div
            className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center overflow-hidden touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="fixed inset-0 z-[999] flex flex-col bg-black animate-in fade-in duration-300 select-none">

                {/* BARRA SUPERIOR */}
                <div className="absolute top-0 left-0 right-0 flex flex-row items-center justify-between p-4 md:px-12 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full shadow-2xl border border-[#F3E5AB]/60 rounded-full bg-black/20 backdrop-blur-md">
                            <Camera size={22} className="text-[#F3E5AB] w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h2 className="text-lg md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-md">
                                {galleryTitle}
                            </h2>
                            <div className="flex items-center gap-2 text-[12px] md:text-[14px] tracking-widest text-[#F3E5AB] font-medium mt-1">
                                <MapPin size={12} />
                                <span>{location || "Local não informado"}</span>
                            </div>
                        </div>
                    </div>

                    {/* BARRA DE FERRAMENTAS PREMIUM - LIGHTBOX */}
                    <div
                        className="flex items-center bg-black/75 backdrop-blur-xl p-2 px-3 md:p-2 md:px-3 rounded-2xl border border-white/20 shadow-2xl pointer-events-auto transition-all"
                        role="toolbar"
                        aria-label="Ferramentas da foto">
                        {/* WHATSAPP */}
                        <button
                            onClick={handleShareWhatsApp}
                            aria-label="Compartilhar esta foto no WhatsApp"
                            className="flex items-center gap-2 hover:text-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-black transition-all group border-r border-white/20 pr-3 md:pr-4"
                        >
                            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-[#25D366]/20 transition-colors">
                                <MessageCircle size={18} className="text-white group-hover:text-[#25D366]" />
                            </div>
                            <div className="hidden md:flex flex-col items-start gap-0.5 leading-none">
                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB]">
                                    WhatsApp
                                </span>
                                <span className="text-[11px] opacity-90 uppercase tracking-[0.1em] font-bold text-white/70">
                                    Compartilhar
                                </span>
                            </div>
                        </button>

                        {/* FAVORITAR COM BALÃO HINT */}
                        <div className="relative flex items-center border-r border-white/20 pr-3 md:pr-4">
                            {showHint && (
                                <div
                                    role="alert"
                                    /* Alterado para top-full e mt-6 para aparecer embaixo da barra */
                                    className="absolute top-full mt-6 left-1/2 -translate-x-1/2 w-48 p-3 bg-white text-black text-[10px] md:text-[12px] font-medium rounded-xl shadow-2xl animate-in fade-in zoom-in slide-in-from-top-2 duration-300 z-[100000]"
                                >
                                    <p className="leading-tight text-center">
                                        Seus favoritos serão salvos <strong>apenas neste dispositivo</strong>.
                                    </p>
                                    {/* Setinha ajustada para o topo do balão, apontando para cima */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white"></div>
                                    <button
                                        onClick={() => setShowHint(false)}
                                        aria-label="Fechar aviso"
                                        className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={toggleFavorite}
                                aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                aria-pressed={isFavorited}
                                className={`pl-1 flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#E67E70] focus:ring-offset-2 focus:ring-offset-black rounded-full group ${isFavorited ? 'text-[#E67E70]' : 'hover:text-[#F3E5AB]'}`}
                            >
                                <div className={`flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full transition-colors ${isFavorited ? 'bg-[#E67E70]/20' : 'bg-white/10 group-hover:bg-[#E67E70]/20'}`}>
                                    <Heart
                                        size={18}
                                        fill={isFavorited ? "currentColor" : "none"}
                                        className={isFavorited ? "animate-pulse" : "text-white group-hover:text-[#E67E70]"}
                                    />
                                </div>
                                <div className="hidden md:flex flex-col items-start gap-0.5 leading-none">
                                    <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB]">
                                        {isFavorited ? "Favorito" : "Favoritar"}
                                    </span>
                                    <span className="text-[11px] opacity-90 uppercase tracking-[0.1em] font-bold text-white/70">
                                        {totalFavorites > 0 ? `(${totalFavorites}) Selecionadas` : "Peça Única"}
                                    </span>
                                </div>
                            </button>
                        </div>

                        {/* DOWNLOAD ALTA RESOLUÇÃO */}
                        <button
                            onClick={handleDownload}
                            aria-label="Baixar esta foto em alta resolução"
                            className="pl-1 flex items-center gap-2 hover:text-[#F3E5AB] focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] focus:ring-offset-2 focus:ring-offset-black transition-all group border-r border-white/20 pr-3 md:pr-4"
                        >
                            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                                {isDownloading ? (
                                    <Loader2 size={16} className="animate-spin text-[#F3E5AB]" />
                                ) : (
                                    <Download size={18} className="text-white group-hover:text-[#F3E5AB]" />
                                )}
                            </div>
                            <div className="hidden md:flex flex-col items-start gap-0.5 leading-none">
                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB]">
                                    {isDownloading ? "Baixando" : "Download"}
                                </span>
                                <span className="text-[11px] opacity-90 uppercase tracking-[0.1em] font-bold text-white/70">
                                    Alta Resolução
                                </span>
                            </div>
                        </button>

                        {/* SAIR (SEM TEXTO) */}
                        <button
                            onClick={onClose}
                            aria-label="Sair e voltar para a galeria principal"
                            className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black rounded-full transition-all group pl-1 md:pl-2"
                        >
                            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-red-500/20 transition-colors">
                                <X size={22} className="text-white group-hover:text-red-400" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* ÁREA CENTRAL */}
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                    <button
                        onClick={onPrev}
                        disabled={activeIndex === 0}
                        className="absolute left-0 z-50 h-full px-6 text-white/10 hover:text-[#F3E5AB] hover:bg-black/10 transition-all hidden md:block disabled:opacity-0"
                    >
                        <ChevronLeft size={64} strokeWidth={1} />
                    </button>

                    <div className="w-full h-full flex items-center justify-center">
                        {isImageLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                                <Loader2 className="w-10 h-10 text-[#F3E5AB] animate-spin mb-2" />
                            </div>
                        )}

                        <img
                            key={photo.id}
                            src={currentUrl}
                            alt="Visualização"
                            onLoad={() => setIsImageLoading(false)}
                            className={`w-full max-h-full object-contain transition-all duration-700 ease-out ${isImageLoading ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}
                        />
                    </div>

                    <button
                        onClick={onNext}
                        disabled={activeIndex === photos.length - 1}
                        className="absolute right-0 z-10 h-full px-6 text-white/10 hover:text-[#F3E5AB] hover:bg-black/10 transition-all hidden md:block disabled:opacity-0"
                    >
                        <ChevronRight size={64} strokeWidth={1} />
                    </button>
                </div>

                {/* RODAPÉ */}
                <div className="absolute bottom-6 left-6 md:bottom-10 md:left-14 z-50 pointer-events-none">
                    <p className="text-white/60 text-base md:text-[20px] italic font-serif">
                        Foto <span className="text-white font-medium">{activeIndex + 1}</span> de {totalPhotos}
                    </p>
                </div>
            </div>
            {/* Componente de Avatar integrado no final do modal */}
            <PhotographerAvatar
                galeria={galeria}
                position="bottom-lightbox" // Aqui deve ser bottom-lightbox
            />
        </div>
    );
}