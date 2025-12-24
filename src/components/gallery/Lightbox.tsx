'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MessageCircle, Loader2, Camera, MapPin } from 'lucide-react';

interface Photo {
    id: string | number;
}

interface LightboxProps {
    photos: Photo[];
    activeIndex: number;
    totalPhotos: number;
    galleryTitle: string;
    location: string;
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
    onClose,
    onNext,
    onPrev
}: LightboxProps) {
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

    // Proteção de dados
    if (!photos || !photos[activeIndex]) return null;
    const photo = photos[activeIndex];

    // URLs
    const getImageUrl = (photoId: string | number, suffix: string = "w400") => 
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

    // Ações: WhatsApp e Download
    // Função de Compartilhar (Tenta enviar o ARQUIVO no celular)
    const handleShareWhatsApp = async () => {
        const highResUrl = getHighResImageUrl(photo.id);
        const shareText = `Confira esta foto da galeria "${galleryTitle}"`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.share && navigator.canShare) {
            try {
                const response = await fetch(highResUrl);
                const blob = await response.blob();
                const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: galleryTitle,
                        text: shareText
                    });
                    return;
                }
            } catch (e) {
                console.error("Erro ao compartilhar arquivo:", e);
            }
        }
        
        // Fallback Desktop: Envia o link direto
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ": " + highResUrl + "&img=.jpg")}`;
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
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="fixed inset-0 z-[9999] flex flex-col bg-black animate-in fade-in duration-300 select-none">
                
                {/* BARRA SUPERIOR - z-[70] e pointer-events-none */}
                <div className="absolute top-0 left-0 right-0 flex flex-row items-center justify-between p-4 md:px-14 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 border border-[#F3E5AB]/30 rounded-full bg-black/20 backdrop-blur-md">
                            <Camera className="text-[#F3E5AB] w-5 h-5 md:w-6 md:h-6" />
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

                    {/* BOTÕES DE AÇÃO - pointer-events-auto */}
                    <div className="flex items-center gap-2 md:gap-4 bg-black/40 backdrop-blur-xl p-1.5 px-3 md:p-2 md:px-6 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
                        <button onClick={handleShareWhatsApp}>
                            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10" />

                        <button onClick={handleDownload}>
                            {isDownloading ? <Loader2 size={18} className="animate-spin text-[#F3E5AB]" /> : <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {isDownloading ? "Processando..." : "Alta Resolução"}
                            </span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10" />

                        <button onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* ÁREA CENTRAL - w-full e max-h-full para ocupar tudo horizontalmente */}
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                    <button
                        onClick={onPrev}
                        className="absolute left-0 z-50 h-full px-6 text-white/10 hover:text-[#F3E5AB] hover:bg-black/10 transition-all hidden md:block"
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
                            /* AJUSTE AQUI: 
                               w-full: Garante que fotos horizontais ocupem toda a largura.
                               max-h-full: Garante que fotos verticais não ultrapassem a altura da tela.
                               object-contain: Mantém a proporção sem cortar a imagem.
                            */
                            className={`w-full max-h-full object-contain transition-all duration-700 ease-out ${isImageLoading ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'
                                }`}
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
                <div className="absolute bottom-6 right-6 md:bottom-10 md:right-14 z-50 pointer-events-none">
                    <p className="text-white/60 text-sm italic font-serif">
                        Foto <span className="text-white font-medium">{activeIndex + 1}</span> de {totalPhotos}
                    </p>
                </div>
            </div>
        </div>
    );
}