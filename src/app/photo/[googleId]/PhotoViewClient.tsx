'use client';
import React, { useEffect, useState } from 'react';
import { Download, Calendar, MapPin, Sparkles, Camera, Loader2, ImageIcon } from 'lucide-react';
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
                <div className="flex items-center gap-4 self-start md:self-center">
                    <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full shadow-2xl border border-[#F3E5AB]/30 rounded-full bg-black/20 backdrop-blur-md">
                        <Camera size={20} className="text-[#F3E5AB] w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
                    </div>
                    <div className="flex flex-col text-left">
                        <h1 className="text-xl md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-md">
                            {data?.title}
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] md:text-[12px] tracking-widest text-[#F3E5AB] font-bold mt-1 uppercase">
                            <MapPin size={12} />
                            <span>{data?.location || "Local não informado"}</span>
                        </div>
                    </div>
                </div>

                {/* BARRA DE BOTÕES - Alinhada abaixo no mobile */}
                <div className="flex items-center gap-4 md:gap-2 bg-black/60 backdrop-blur-2xl 
                p-2 px-6 md:px-4 rounded-full border border-white/20 shadow-2xl pointer-events-auto transition-all duration-300">
                    <button
                        onClick={handleDownload}
                        className="flex items-center hover:text-[#F3E5AB] transition-all group 
                         border-r border-white/20 pr-4 md:pr-4"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                            {isDownloading ? (
                                <Loader2 size={18} className="animate-spin text-[#F3E5AB]" />
                            ) : (
                                <Download size={20} className="text-white group-hover:text-[#F3E5AB]" />
                            )}
                        </div>
                                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB]">
                                Baixar Alta Resolução
                            </span>
                    
                    </button>

                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-3 hover:text-[#F3E5AB] transition-all group"
                    >
                        <ImageIcon size={18} 
                        strokeWidth={2.5} className="text-white group-hover:text-red-400 transition-colors" />
                        <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest italic text-white group-hover:text-[#F3E5AB]">
                            Ver Galeria de Fotos
                        </span>
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

                    {/* BARRA DE INFORMAÇÕES - Abaixo da foto no mobile e absoluta no desktop */}
                    <div className="relative md:absolute mt-2 md:mt-0 md:bottom-6 left-0 md:left-1/2 md:-translate-x-1/2 z-50 w-full flex justify-center pb-0">
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