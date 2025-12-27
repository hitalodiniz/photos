'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MessageCircle, Loader2, Camera, MapPin, Heart, FolderDown } from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';

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
    const [showButtonText, setShowButtonText] = useState(true);

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

    //Efeito dos botões de ação
    useEffect(() => {
        // Oculta o texto após 5 segundos da primeira abertura
        const timer = setTimeout(() => setShowButtonText(false), 3000);
        return () => clearTimeout(timer);
    }, []);

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
    /* Removido o touch-none para permitir scroll no mobile quando o conteúdo cresce */
    className="fixed inset-0 z-[999] bg-black flex flex-col items-center overflow-y-auto md:overflow-hidden select-none"
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
>
    <div 
        /* Alterado de fixed para relative no mobile para que a div cresça com o conteúdo interno (imagem + avatar) */
        className="relative md:fixed inset-0 z-[999] flex flex-col bg-black animate-in fade-in duration-300 min-h-full"
    >

                {/* BARRA SUPERIOR */}
                <div className="relative md:absolute top-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent w-full gap-6">

                    {/* Título e Localização (Header) */}

                    <GalleryHeader
                        title={galleryTitle}
                        location={location}
                        isLightbox={true}
                    />

                    {/* Barra de Ferramentas Premium - Mobile: Alinhada à direita ou centro */}
                    {/* Barra de Ferramentas (Direita no Desktop, Centro no Mobile) */}
                    <div className="w-full md:w-auto flex justify-center md:justify-end pointer-events-auto z-[100]">
                        <div
                            className="flex items-center bg-black/80 backdrop-blur-2xl p-1.5 px-3 md:p-2 md:px-3 rounded-2xl border border-white/20 shadow-2xl transition-all duration-500 ease-in-out"
                            onMouseEnter={() => setShowButtonText(true)}
                            onMouseLeave={() => setShowButtonText(false)}
                            role="toolbar"
                        >
                            {/* WHATSAPP - Texto restaurado com controle de visibilidade */}
                            <button
                                onClick={handleShareWhatsApp}
                                className="flex items-center gap-0 hover:gap-2 transition-all duration-500 group border-r border-white/10 pr-3"
                            >
                                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-[#25D366]/20 transition-colors shrink-0">
                                    <MessageCircle size={16} className="text-white group-hover:text-[#25D366]" />
                                </div>
                                {/* O container abaixo garante que o texto apareça no hover ou no timer inicial */}
                                <div className={`flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}>
                                    <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">WhatsApp</span>
                                    <span className="text-[8px] md:text-[11px] opacity-60 uppercase font-bold text-white/70 whitespace-nowrap">Compartilhar</span>
                                </div>
                            </button>

                            {/* FAVORITAR */}
                            <div className="relative flex items-center border-r border-white/10 pr-3 ml-2">
                                <button
                                    onClick={toggleFavorite}
                                    className={`flex items-center gap-0 transition-all duration-500 group ${isFavorited ? 'text-[#E67E70]' : 'hover:text-[#F3E5AB]'}`}
                                >
                                    <div className={`flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full transition-colors shrink-0 ${isFavorited ? 'bg-[#E67E70]/20' : 'bg-white/5'}`}>
                                        <Heart size={16} fill={isFavorited ? "currentColor" : "none"} className={isFavorited ? "animate-pulse" : "text-white"} />
                                    </div>
                                    <div className={`flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}>
                                        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">Favoritar</span>
                                        <span className="text-[8px] md:text-[11px] opacity-60 uppercase font-bold text-white/70 whitespace-nowrap">{totalFavorites > 0 ? `(${totalFavorites})` : "Foto"}</span>
                                    </div>
                                </button>
                            </div>

                            {/* DOWNLOAD */}
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-0 transition-all duration-500 group border-r border-white/10 pr-3 ml-2"
                            >
                                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                                    {isDownloading ? <Loader2 size={14} className="animate-spin text-[#F3E5AB]" /> : <Download size={16} className="text-white" />}
                                </div>
                                <div className={`flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}>
                                    <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">Download</span>
                                    <span className="text-[8px] md:text-[11px] opacity-60 uppercase font-bold text-white/70 whitespace-nowrap">Alta Res.</span>
                                </div>
                            </button>

                            {/* FECHAR */}
                            <button onClick={onClose} className="flex items-center justify-center pl-2 ml-1  ">
                                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors shrink-0">
                                    <X size={20} className="text-white hover:text-red-400" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                {/* ÁREA CENTRAL */}
                <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">

                    {/* Setas Laterais (Desktop) */}
                    <button onClick={onPrev} className="absolute left-0 z-[80] h-full px-6 text-white/10 hover:text-[#F3E5AB] hidden md:block">
                        <ChevronLeft size={64} strokeWidth={1} />
                    </button>

                    {/* Container Principal da Foto + Avatar */}
                    <div className="flex flex-col items-center justify-center w-full h-full max-h-screen p-4 md:p-0">
                        <div className="relative flex flex-col items-center">
                            {isImageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 className="w-10 h-10 text-[#F3E5AB] animate-spin" />
                                </div>
                            )}

                            <img
                                key={photo.id}
                                src={currentUrl}
                                alt="Visualização"
                                onLoad={() => setIsImageLoading(false)}
                                className={`max-w-full max-h-[65vh] md:max-h-[80vh] object-contain transition-all duration-700 ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                            />
                            {/* 3. RODAPÉ - CONTADOR FIXO ESTILO PHOTO VIEW CLIENT */}
                            <div className="block md:hidden">
                                <div className="flex bottom-6 left-6 md:bottom-10 md:left-14 z-[90] pointer-events-none">
                                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 px-4 rounded-full border border-white/10 shadow-lg">
                                        <div className="w-8 h-8 rounded-full border border-[#F3E5AB]/40 flex items-center justify-center text-[#F3E5AB] text-[10px] font-black">
                                            N
                                        </div>
                                        <p className="text-white/80 text-sm md:text-lg italic font-serif">
                                            Foto <span className="text-[#F3E5AB] font-bold">{activeIndex + 1}</span> de {totalPhotos}
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <button onClick={onNext} className="absolute right-0 z-[80] h-full px-6 text-white/10 hover:text-[#F3E5AB] hidden md:block">
                        <ChevronRight size={64} strokeWidth={1} />
                    </button>
                </div>
                {/* RODAPÉ */}
                <div className="absolute bottom-6 md:block hidden center md:bottom-10 md:left-14 z-50 pointer-events-none">
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