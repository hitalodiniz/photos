'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MessageCircle, Loader2, Camera, MapPin, Heart } from 'lucide-react';

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

    // ✅ Proteção contra renderização sem dados
    if (!photos || !photos[activeIndex]) return null;

    // ✅ SEGURANÇA: Se o índice for maior que o array carregado, não quebra
    if (!photos || !photos[activeIndex]) {
        return null;
    }

    const photo = photos[activeIndex];

    // Helper para URL (w400 para grid, s0 para original/ZIP)
    const getImageUrl = (photoId: string, suffix: string = "w400") => {
        return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
    };

    const currentUrl = getImageUrl(photo.id);

    useEffect(() => {
        setIsImageLoading(true);

        // Pre-load da próxima foto (se existir no array)
        if (activeIndex + 1 < photos.length) {
            const nextImg = new Image();
            nextImg.src = getImageUrl(photos[activeIndex + 1].id);
        }
    }, [activeIndex, photos]);

    // Atalhos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(currentUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${galleryTitle}-foto-${activeIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            window.open(currentUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        /* ✅ CORREÇÃO DO FUNDO: bg-black (sem transparência) ou bg-black/100 para garantir escuridão total */
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black animate-in fade-in duration-300 select-none">

            {/* BARRA SUPERIOR */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 md:px-14 md:py-6 text-white/90 z-50 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 border border-[#F3E5AB]/30 rounded-full bg-[#F3E5AB]/5">
                        <Camera className="text-[#F3E5AB] w-6 h-6" />
                    </div>
                    <div className="flex flex-col text-left">
                        <h2 className="text-lg md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-md">
                            {galleryTitle}
                        </h2>
                        <div className="flex items-center gap-2 text-[9px] md:text-[11px] uppercase tracking-widest text-[#F3E5AB] font-bold mt-1">
                            <MapPin size={12} />
                            <span>{location || "Local não informado"}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-4 bg-white/10 py-2 px-6 rounded-full border border-white/10 backdrop-blur-md">
                    <button onClick={handleDownload} disabled={isDownloading} className="hover:text-[#F3E5AB] transition-all flex items-center gap-2 group">
                        {isDownloading ? <Loader2 size={18} className="animate-spin text-[#F3E5AB]" /> : <Download size={18} />}
                        <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-widest">Download</span>
                    </button>
                    <div className="w-[1px] h-4 bg-white/20 mx-1" />
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>
            </div>

            {/* ÁREA CENTRAL */}
            <div className="relative flex-grow flex items-center justify-center overflow-hidden">
 {/* Botão Anterior */}
                <button 
                    onClick={onPrev}
                    className="absolute left-6 z-50 p-4 text-white/20 hover:text-white transition-all hidden md:block"
                >
                    <ChevronLeft size={64} strokeWidth={1} />
                </button>

                <div className="relative w-full h-full flex items-center justify-center p-2 md:p-10">
                    {isImageLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Loader2 className="w-12 h-12 text-[#F3E5AB] animate-spin mb-4" />
                            <span className="text-[#F3E5AB] text-[10px] uppercase tracking-[0.4em] font-bold">Processando Alta Resolução...</span>
                        </div>
                    )}

                    <img
                        key={photo.id}
                        src={currentUrl}
                        alt="Visualização"
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => setIsImageLoading(false)}
                        className={`max-w-full max-h-full object-contain shadow-2xl transition-all duration-500 ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                    />
                </div>
                {/* Botão Próximo - ✅ Bloqueia se for a última foto disponível no array */}
                <button
                    onClick={onNext}
                    disabled={activeIndex === photos.length - 1}
                    className="absolute right-6 z-50 p-4 text-white/20 hover:text-white transition-all hidden md:block disabled:hidden"
                >
                    <ChevronRight size={64} strokeWidth={1} />
                </button>
            </div>

            {/* RODAPÉ */}
            <div className="p-6 text-center z-50 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white/60 text-sm italic font-serif">
                    Foto <span className="text-white font-medium">{activeIndex + 1}</span> de {totalPhotos}
                </p>
            </div>
        </div>
    );
}