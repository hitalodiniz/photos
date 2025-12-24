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
        const highResUrl = getHighResImageUrl(photo.id);
        const shareText = `Confira esta foto da galeria "${galleryTitle}"`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                const response = await fetch(highResUrl);
                const blob = await response.blob();
                const file = new File([blob], "foto.jpg", { type: "image/jpeg" });

                await navigator.share({
                    files: [file],
                    title: galleryTitle,
                    text: shareText
                });
                return;
            } catch (e) {
                console.error("Erro ao compartilhar arquivo:", e);
            }
        }
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ": " + highResUrl)}`;
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
                <div className="absolute top-0 left-0 right-0 flex flex-row items-center justify-between p-4 md:px-14 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-16 md:h-16 border border-[#F3E5AB]/30 rounded-full bg-black/20 backdrop-blur-md">
                            <Camera className="text-[#F3E5AB] w-8 h-8 md:w-10 md:h-10" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h2 className="text-lg md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-md">
                                {galleryTitle}
                            </h2>
                            <div className="flex items-center gap-2 text-[9px] md:text-[12px] tracking-widest text-[#F3E5AB] font-bold mt-1 uppercase">
                                <MapPin size={12} />
                                <span>{location || "Local não informado"}</span>
                            </div>
                        </div>
                    </div>

                    {/* BOTÕES DE AÇÃO */}
                    <div className="flex items-center gap-2 md:gap-4 bg-black/40 backdrop-blur-xl p-1.5 px-3 md:p-2 md:px-6 rounded-full border border-white/10 shadow-2xl pointer-events-auto">

                        {/* WHATSAPP */}
                        <button onClick={handleShareWhatsApp} className="flex flex-col items-center hover:text-[#F3E5AB] transition-colors">
                            <MessageCircle size={20} />
                            <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider p-2">WhatsApp</span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10" />

                        {/* FAVORITAR - Com lógica de estado visual */}

                        {/* BALÃO INFORMATIVO (HINT) ABAIXO DO BOTÃO */}
                        {showHint && (
                            <div className="absolute top-full mt-4 w-48 p-3 bg-white text-black md:text-[16px] text-[10px] font-medium rounded-xl shadow-2xl animate-in fade-in zoom-in slide-in-from-top-2 duration-300 z-[100000]">
                                <p className="leading-tight">
                                    Seus favoritos serão salvos <strong>apenas neste dispositivo</strong>.
                                </p>

                                {/* Setinha do balão (agora no topo, apontando para cima) */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white"></div>

                                {/* Botão fechar balão */}
                                <button
                                    onClick={() => setShowHint(false)}
                                    className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {/* BOTÃO FAVORITAR */}
                        <button
                            onClick={toggleFavorite}
                            className={`flex flex-col items-center transition-all min-w-[95px] ${isFavorited ? 'text-red-500' : 'hover:text-[#F3E5AB]'}`}
                        >
                            <Heart
                                size={20}
                                fill={isFavorited ? "currentColor" : "none"}
                                className={isFavorited ? "animate-pulse" : ""}
                            />
                            <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider p-2 whitespace-nowrap">
                                {totalFavorites > 0 && <span className="mr-1">({totalFavorites})</span>}
                                {isFavorited ? "Favorito" : "Favoritar"}
                            </span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10" />

                        {/* DOWNLOAD */}
                        <button onClick={handleDownload} className="flex flex-col items-center hover:text-[#F3E5AB] transition-colors">
                            {isDownloading ? <Loader2 size={18} className="animate-spin text-[#F3E5AB]" /> : <Download size={18} />}
                            <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider p-2">
                                {isDownloading ? "Processando..." : "Download"}
                            </span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10" />

                        {/* FECHAR */}
                        <button onClick={onClose} className="hover:text-red-400 transition-colors">
                            <X size={24} />
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