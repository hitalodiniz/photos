'use client';
import React, { useEffect, useState } from 'react';
import { Download, ArrowLeft, Calendar, MapPin, Sparkles, Camera, Loader2 } from 'lucide-react';
import { DynamicHeroBackground } from '@/components/layout';
import PhotographerAvatar from '@/components/gallery/PhotographerAvatar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PhotoViewClient({ googleId, slug }: { googleId: string, slug: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    const imageUrlHigh = `https://lh3.googleusercontent.com/d/${googleId}=s0`;
    const currentImageUrl = `https://lh3.googleusercontent.com/d/${googleId}=s1024`;

    useEffect(() => {
    async function fetchInfo() {
        if (!slug) return;

        try {
            // LIMPEZA: Remove o "%2F" inicial (que vira "/") se existir
            const cleanedSlug = slug.startsWith('/') ? slug.substring(1) : slug;
            
            console.log("Slug para busca:", cleanedSlug);

            const { data: galData, error } = await supabase
                .from('tb_galerias')
                .select(`
                    *, 
                    photographer:tb_profiles (*)
                `)
                .eq('slug', cleanedSlug) // Busca com o slug limpo
                .single();

            if (error) {
                console.error("Supabase Error:", error.message);
                throw error;
            }

            setData(galData);
        } catch (err: any) {
            // Agora o log mostrará o erro real, não apenas {}
            console.error("Erro detalhado na busca:", err.message || err);
        } finally {
            setLoading(false);
        }
    }
    fetchInfo();
}, [slug]);

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
            Sincronizando peça exclusiva...
        </div>
    );

    return (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center overflow-hidden select-none">
            <div className="fixed inset-0 z-0 opacity-20">
                <DynamicHeroBackground />
            </div>

            {/* BARRA SUPERIOR - ESTILO LIGHTBOX */}
            <div className="absolute top-0 left-0 right-0 flex flex-row items-center justify-between p-4 md:px-14 md:py-8 text-white/90 z-[70] bg-gradient-to-b from-black/90 via-black/40 to-transparent">

                {/* TÍTULO À ESQUERDA */}
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-16 md:h-16 border border-[#F3E5AB]/30 rounded-full bg-black/20 backdrop-blur-md">
                        <Camera size={24} className="text-[#F3E5AB] md:w-8 md:h-8" />
                    </div>
                    <div className="flex flex-col text-left">
                        <h2 className="text-lg md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-md">
                            {data?.title}
                        </h2>
                        <div className="flex items-center gap-2 text-[9px] md:text-[12px] tracking-widest text-[#F3E5AB] font-bold mt-1 uppercase">
                            <MapPin size={12} />
                            <span>{data?.location || "Local não informado"}</span>
                        </div>
                    </div>
                </div>

                {/* BOTÕES DE AÇÃO À DIREITA */}
                <div className="flex items-center gap-2 md:gap-4 bg-black/40 backdrop-blur-xl p-1.5 px-3 md:p-2 md:px-6 rounded-full border border-white/10 shadow-2xl">

                    {/* BOTÃO BAIXAR (DOIS NÍVEIS) */}
                    <button onClick={handleDownload} className="flex items-center gap-3 hover:text-[#F3E5AB] transition-colors border-r border-white/10 pr-4">
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={20} />}
                        <div className="flex flex-col items-start leading-none hidden md:flex">
                            <span className="text-[11px] font-black uppercase tracking-wider italic">Baixar</span>
                            <span className="text-[8px] opacity-60 uppercase tracking-widest">Alta Resolução</span>
                        </div>
                    </button>

                    {/* BOTÃO VER GALERIA (VOLTAR) */}
                    <button
                        onClick={() => window.history.back()}
                        className="flex flex-col items-center hover:text-red-400 transition-colors"
                    >
                        <ArrowLeft size={22} />
                        <span className="hidden md:block text-[9px] font-bold uppercase tracking-widest mt-1">Ver Galeria</span>
                    </button>
                </div>
            </div>

            {/* ÁREA CENTRAL - FOTO OCUPANDO ESPAÇO MÁXIMO */}
            <div className="relative w-full h-full flex items-center justify-center p-2 md:p-12 overflow-hidden bg-black">
                <img
                    src={currentImageUrl}
                    className="w-full h-full object-contain transition-all duration-700 ease-out shadow-2xl"
                    alt="Visualização Editorial"
                />

                {/* BARRA DE INFORMAÇÕES (DATA E EXCLUSIVO) SEMPRE ABAIXO DA FOTO */}
                <div className="absolute bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex items-center gap-4 bg-black/50 backdrop-blur-lg px-6 py-2.5 rounded-full border border-white/10 shadow-2xl">
                        <div className="flex items-center gap-2 text-white text-[13px] md:text-[14px] font-medium italic">
                            <Calendar size={16} className="text-[#F3E5AB]" />
                            <span>{data?.date && new Date(data.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="w-[1px] h-4 bg-white/20"></div>
                        <div className="flex items-center gap-2 text-white text-[13px] md:text-[14px] font-medium italic">
                            <Sparkles size={16} className="text-[#F3E5AB]" />
                            <span>Acesso Exclusivo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AVATAR DO FOTÓGRAFO (POSIÇÃO OFICIAL DO LIGHTBOX) */}
            {data?.photographer && (
                <PhotographerAvatar
                    galeria={{
                        ...data,
                        photographer_name: data.photographer.full_name,
                        photographer_avatar_url: data.photographer.profile_picture_url,
                        photographer_phone: data.photographer.phone_contact,
                        photographer_instagram: data.photographer.instagram_link,
                    }}
                    position="bottom-lightbox"
                />
            )}
        </div>
    );
}