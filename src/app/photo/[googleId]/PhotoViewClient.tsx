'use client';
import React, { useEffect, useState } from 'react';
import { Download, Calendar, MapPin, Sparkles, Camera, Loader2, ImageIcon } from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PhotoViewClient({ googleId, slug }: { googleId: string, slug: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showButtonText, setShowButtonText] = useState(true);

    const imageUrlHigh = `https://lh3.googleusercontent.com/d/${googleId}=s0`;
    const currentImageUrl = `https://lh3.googleusercontent.com/d/${googleId}=s800`;

    useEffect(() => {
        async function fetchInfo() {
            if (!slug) return;
            try {
                const cleanedSlug = slug.startsWith('/') ? slug.substring(1) : slug;
                const { data: galData, error } = await supabase
                    .from('tb_galerias')
                    .select(`*, photographer:tb_profiles (*)`)
                    .eq('slug', cleanedSlug)
                    .single();

                if (error) throw error;
                setData(galData);
            } catch (err: any) {
                console.error("Erro na busca:", err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchInfo();
    }, [slug]);

    //Efeito dos botões de ação
    useEffect(() => {
        // Oculta o texto após 3 segundos da primeira abertura
        const timer = setTimeout(() => setShowButtonText(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(imageUrlHigh);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data?.title || 'foto'}_alta_res.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            window.open(imageUrlHigh, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB] animate-pulse font-serif italic">
            Carregando foto exclusiva...
        </div>
    );

    return (
        /* Ajustado para overflow-y-auto no mobile para permitir rolagem vertical da pilha */
        <div className="md:fixed md:inset-0 z-[999] bg-black flex flex-col items-center overflow-y-auto md:overflow-hidden select-none min-h-screen">

            {/* BARRA SUPERIOR - No mobile vira um bloco no topo da pilha */}
            <header className="relative md:absolute top-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent w-full gap-6">

                {/* TÍTULO À ESQUERDA */}
                <GalleryHeader
                    title={data?.title}
                    location={data?.location || "Local não informado"}
                    data={data.date}
                />
                
                {/* BARRA DE BOTÕES - AJUSTADA PARA FUNDO CHAMPANHE CLARO */}
                <div
                    /* Eventos adicionados para reexibir o texto ao passar o mouse */
                    onMouseEnter={() => setShowButtonText(true)}
                    onMouseLeave={() => setShowButtonText(false)}
                    className="flex items-center bg-black/75 backdrop-blur-xl p-2 px-4 md:p-2 md:px-5 rounded-2xl border border-white/20 shadow-2xl pointer-events-auto transition-all"
                    role="toolbar"
                    aria-label="Ferramentas da galeria"
                >
                    {/* BOTÃO BAIXAR */}
                    <button
                        onClick={handleDownload}
                        aria-label="Baixar todas as fotos em alta resolução"
                        className="flex items-center gap-0 hover:gap-3 pr-4 hover:text-[#F3E5AB] focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] focus:ring-offset-2 focus:ring-offset-black transition-all group border-r border-white/20"
                    >
                        <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors shrink-0">
                            {isDownloading ? (
                                <Loader2 size={16} className="animate-spin text-[#F3E5AB]" />
                            ) : (
                                <Download size={18} className="text-white group-hover:text-[#F3E5AB]" />
                            )}
                        </div>

                        <div className={`flex flex-col items-start gap-0.5 leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[120px] opacity-100 ml-2 pr-3' : 'max-w-0 opacity-0 ml-0'}`}>
                            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB] whitespace-nowrap">
                                Download
                            </span>
                            <span className="text-[11px] opacity-90 uppercase tracking-[0.1em] font-bold text-white/70 whitespace-nowrap">
                                Alta Resolução
                            </span>
                        </div>
                    </button>

                    {/* BOTÃO VER GALERIA */}
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(window.location.search);
                            const galleryPath = params.get('s');
                            window.location.href = galleryPath ? decodeURIComponent(galleryPath) : './';
                        }}
                        aria-label="Voltar para a galeria de fotos"
                        className="flex items-center gap-0 hover:gap-2 pl-2 hover:text-[#F3E5AB] focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] focus:ring-offset-2 focus:ring-offset-black transition-all duration-500 group"
                    >
                        <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors shrink-0">
                            <Camera size={20} className="text-white group-hover:text-[#F3E5AB]" />
                        </div>

                        <div className={`flex flex-col items-start gap-0.5 leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[120px] opacity-100 ml-2 pr-2' : 'max-w-0 opacity-0 ml-0'}`}>
                            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">
                                Ver Galeria
                            </span>
                            <span className="text-[11px] opacity-70 uppercase tracking-[0.1em] font-bold text-white/70 whitespace-nowrap">
                                De Fotos
                            </span>
                        </div>
                    </button>
                </div>
            </header>

            {/* ÁREA CENTRAL - FOTO */}
            <main className="relative flex-grow w-full flex flex-col items-center justify-center bg-black md:overflow-hidden pt-0">
                <div className="relative w-full h-full flex flex-col items-center justify-center p-0 md:p-4">
                    <img
                        src={currentImageUrl}
                        className="w-full h-auto md:h-full object-contain transition-all duration-700 ease-out"
                        alt="Visualização Editorial"
                    />

                    
                </div>
            </main>

            {/* AVATAR DO FOTÓGRAFO - No mobile flui para o fim da página */}
            {data?.photographer && (
                <div className="relative md:absolute md:bottom-0 md:right-0 md:p-0">
                    <PhotographerAvatar
                        galeria={{
                            ...data,
                            photographer_name: data.photographer.full_name,
                            photographer_avatar_url: data.photographer.profile_picture_url,
                            photographer_phone: data.photographer.phone_contact,
                            photographer_instagram: data.photographer.instagram_link,
                            photographer_id: data.photographer.username,
                        }}
                        position="bottom-lightbox"
                    />
                </div>
            )}
        </div>
    );
}