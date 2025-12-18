'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Heart, MessageCircle, Loader2, Camera, MapPin } from 'lucide-react';

interface Photo {
    id: string | number;
    url: string;
}

interface LightboxProps {
    photo: Photo;
    totalPhotos: number;
    currentNumber: number;
    galleryTitle: string;
    location: string;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function Lightbox({
    photo,
    totalPhotos,
    currentNumber,
    galleryTitle,
    location,
    onClose,
    onNext,
    onPrev
}: LightboxProps) {
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Resetar o loading sempre que a foto mudar
    useEffect(() => {
        setIsImageLoading(true);
    }, [photo]);

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

    // FUNÇÃO DE DOWNLOAD REFINADA
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            
            // Tentativa de download via Blob (funciona se o CORS permitir)
            const response = await fetch(photo.url);
            if (!response.ok) throw new Error("CORS or Network error");
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `foto-${currentNumber}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn("Download direto bloqueado pelo Drive, abrindo em nova aba...");
            // Fallback para Google Drive: abre o link direto para visualização/download
            window.open(photo.url, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const shareWhatsApp = () => {
        const text = `Confira esta foto da galeria "${galleryTitle}": ${photo.url}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-300 select-none">
            {/* BARRA SUPERIOR */}
            <div className="flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-6 text-white/90">
                
                {/* INFORMAÇÕES DO ENSAIO */}
                <div className="flex items-center gap-4 md:gap-6">
                    {/* ÍCONE DA CÂMARA */}
                    <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 border border-[#D4AF37]/40 rounded-full bg-[#D4AF37]/5 backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                        <Camera className="text-[#D4AF37] w-7 h-7 md:w-8 md:h-8" />
                    </div>

                    <div className="flex flex-col justify-center">
                        <h2 className="text-xl md:text-2xl font-bold italic text-white tracking-tight leading-tight font-serif">
                            {galleryTitle}
                        </h2>
                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mt-1 opacity-90">
                            <MapPin size={12} className="opacity-80" />
                            <span className="whitespace-nowrap">{location || "Local não informado"}</span>
                        </div>
                    </div>
                </div>

                {/* CONTROLES TÉCNICOS */}
                <div className="mt-6 md:mt-0 flex items-center gap-4 md:gap-6 bg-white/5 py-2.5 px-6 md:px-8 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
                    <button onClick={shareWhatsApp} className="hover:text-[#25D366] transition-all flex items-center gap-2 group">
                        <MessageCircle size={18} className="group-hover:rotate-12 transition-transform" />
                        <span className="hidden lg:inline text-[10px] font-extrabold uppercase tracking-widest">WhatsApp</span>
                    </button>

                    <button className="hover:text-red-500 transition-all flex items-center gap-2 group">
                        <Heart size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="hidden lg:inline text-[10px] font-extrabold uppercase tracking-widest">Favoritar</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="hover:text-[#4285F4] transition-all flex items-center gap-2 group disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        )}
                        <span className="hidden lg:inline text-[10px] font-extrabold uppercase tracking-widest">
                            {isDownloading ? 'Baixando...' : 'Download'}
                        </span>
                    </button>

                    <div className="w-[1px] h-5 bg-white/20 mx-1" />

                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* ÁREA CENTRAL DA IMAGEM */}
            <div className="relative flex-grow flex items-center justify-center overflow-hidden">
                {/* Botão Anterior */}
                <button 
                    onClick={onPrev} 
                    className="absolute left-4 md:left-8 z-20 p-4 text-white/20 hover:text-white hover:scale-110 transition-all hidden md:block"
                >
                    <ChevronLeft size={56} strokeWidth={1} />
                </button>

                <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
                    {isImageLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mb-4 opacity-50" />
                            <span className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-bold">A carregar Arte...</span>
                        </div>
                    )}

                    <img
                        src={photo.url}
                        alt={`Foto ${currentNumber}`}
                        onLoad={() => setIsImageLoading(false)}
                        className={`
                            max-w-full max-h-full object-contain shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-all duration-700 ease-out
                            ${isImageLoading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}
                        `}
                    />
                </div>

                {/* Botão Próximo */}
                <button 
                    onClick={onNext} 
                    className="absolute right-4 md:right-8 z-20 p-4 text-white/20 hover:text-white hover:scale-110 transition-all hidden md:block"
                >
                    <ChevronRight size={56} strokeWidth={1} />
                </button>
                
                {/* Áreas de toque para Mobile */}
                <div className="absolute inset-y-0 left-0 w-20 z-10 md:hidden" onClick={onPrev} />
                <div className="absolute inset-y-0 right-0 w-20 z-10 md:hidden" onClick={onNext} />
            </div>

            {/* RODAPÉ */}
            <div className="p-8 text-center">
                <p className="text-white/60 text-base md:text-lg italic font-light font-serif tracking-wide">
                    Obra <span className="text-white font-medium">{currentNumber}</span> de <span className="text-white font-medium">{totalPhotos}</span>
                </p>
                <div className="mt-4 flex justify-center gap-1">
                    <div className="h-1 w-12 rounded-full bg-[#D4AF37]/40" />
                </div>
            </div>
        </div>
    );
}