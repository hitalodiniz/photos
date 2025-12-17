'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Heart, MessageCircle, Loader2, Camera, MapPin } from 'lucide-react';

interface Photo {
    id: number;
    url: string;
}

interface LightboxProps {
    photo: Photo;
    totalPhotos?: number;
    galleryTitle?: string; // Novo campo
    location?: string;     // Novo campo
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function Lightbox({
    photo,
    totalPhotos = 24,
    galleryTitle = "Ensaio Editorial • Marina & Costa",
    location = "Estúdio Luz, São Paulo",
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    // FUNÇÃO DE DOWNLOAD
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(photo.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `foto-${photo.id}.jpg`; // Nome do ficheiro ao baixar
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erro ao baixar a imagem:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const shareWhatsApp = () => {
        const text = `Confira esta foto da nossa galeria: ${photo.url}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
            {/* BARRA SUPERIOR REFINADA COM ÍCONE E FONTES AMPLIADAS */}
            <div className="flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-6 text-white/90">
                {/* INFORMAÇÕES DO ENSAIO (Tudo alinhado à direita do ícone) */}
                <div className="flex items-center gap-4 md:gap-6">

                    {/* ÍCONE DA CÂMARA (Círculo Dourado) */}
                    <div className="flex-shrink-0 flex items-center justify-center w-14 
                    h-14 md:w-18 md:h-18 border border-[#D4AF37]/40 rounded-full bg-[#D4AF37]/5 
                    backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                        <Camera className="text-[#D4AF37] w-7 h-7 md:w-8 md:h-8" />
                    </div>

                    {/* CONTAINER DE TEXTOS (Título em cima, Localização em baixo - ambos à direita do ícone) */}
                    <div className="flex flex-col justify-center">
                        <h2
                            className="text-2xl md:text-3xl font-bold italic text-white tracking-tight leading-tight"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            {galleryTitle}
                        </h2>

                        <div className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#D4AF37] font-bold mt-1 md:mt-2 opacity-90">
                            <MapPin size={14} className="opacity-80 flex-shrink-0" />
                            <span className="whitespace-nowrap">{location}</span>
                        </div>
                    </div>
                </div>
                {/* CONTROLOS TÉCNICOS (Canto Superior Direito) */}
                <div className="flex items-center gap-4 md:gap-6 bg-white/5 py-3 px-8 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
                    <button onClick={shareWhatsApp} className="hover:text-[#25D366] transition-all flex items-center gap-2 group">
                        <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                        <span className="hidden lg:inline text-[10px] font-extrabold uppercase tracking-widest">WhatsApp</span>
                    </button>

                    <button className="hover:text-red-500 transition-all flex items-center gap-2 group">
                        <Heart size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="hidden lg:inline text-[11px] font-extrabold uppercase tracking-widest">Favoritar</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="hover:text-[#4285F4] transition-all flex items-center gap-2 group disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="hidden lg:inline text-[11px] font-extrabold uppercase tracking-widest">
                            {isDownloading ? 'Baixando' : 'Download'}
                        </span>
                    </button>

                    <div className="w-[1px] h-5 bg-white/20 mx-1" />

                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                        <X size={26} />
                    </button>
                </div>
            </div>

            {/* ÁREA CENTRAL */}
            <div className="relative flex-grow flex items-center justify-center py-0">
                <button onClick={onPrev} className="absolute left-4 z-20 text-white/20 hover:text-white transition-all">
                    <ChevronLeft size={48} />
                </button>

                <div className="relative max-w-6xl max-h-[80vh] w-full h-full flex items-center justify-center">
                    {isImageLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 rounded-2xl animate-pulse">
                            <Loader2 className="w-8 h-8 text-white/20 animate-spin mb-2" />
                            <span className="text-white/20 text-[10px] uppercase tracking-widest">A carregar Arte...</span>
                        </div>
                    )}

                    <img
                        src={photo.url}
                        alt="Preview"
                        onLoad={() => setIsImageLoading(false)}
                        className={`
              max-w-full max-h-full object-contain shadow-2xl transition-all duration-700
              ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}
                    />
                </div>

                <button onClick={onNext} className="absolute right-4 z-20 p-4 text-white/20 hover:text-white transition-all">
                    <ChevronRight size={48} />
                </button>
            </div>

            {/* RODAPÉ */}
            <div className="p-6 text-center bg-gradient-to-t from-black/50 to-transparent">
                <p
                    className="text-white/80 text-lg md:text-xl italic font-light"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                >
                    Foto {photo.id} de {totalPhotos}
                </p>
            </div>
        </div>
    );
}