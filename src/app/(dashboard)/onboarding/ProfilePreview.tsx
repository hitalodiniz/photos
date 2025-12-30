'use client';
import React, { useEffect, useState } from 'react';
import { Instagram, MessageCircle, MapPin, Share2, User as UserIcon } from 'lucide-react';
import { DynamicHeroBackground, Footer, EditorialHeader } from '@/components/layout';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PhotographerProfile({ initialData }: { initialData?: any }) {
    const params = useParams();
    const [profile, setProfile] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        // Se já temos initialData (modo Preview), não buscamos no banco
        if (initialData) {
            setProfile(initialData);
            setLoading(false);
            return;
        }

        async function fetchProfile() {
            if (!params.username) return;
            try {
                const { data, error } = await supabase
                    .from('tb_profiles')
                    .select('*')
                    .eq('username', params.username)
                    .single();

                if (error) throw error;
                setProfile(data);
            } catch (error) {
                console.error('Erro ao carregar perfil:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [params.username, initialData]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">Carregando...</div>;
    if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">Perfil não encontrado.</div>;

    // Normalização de campos (Banco vs Formulário)
    const fullName = profile.full_name || profile.fullName;
    const username = profile.username;
    const bio = profile.mini_bio || profile.miniBio;
    const avatar = profile.profile_picture_url || profile.avatar_url || profile.photoPreview;
    const whatsapp = profile.phone_contact || profile.phone;
    const instaLink = profile.instagram_link || profile.instagram_url || profile.instagram;
    
    // Lógica de Localização Inteligente
    const cities = profile.operating_cities || profile.cities || [];
    const locationDisplay = cities.length > 0
        ? (cities.length <= 2 ? cities.join(' • ') : `${cities.slice(0, 2).join(', ')} + ${cities.length - 2}`)
        : (profile.location || "SUA LOCALIZAÇÃO");

    return (
        <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
            <div className="absolute inset-0 z-0">
                <DynamicHeroBackground />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/80 pointer-events-none" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <EditorialHeader
                    title={fullName}
                    subtitle={<>@{username} • <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">Fotografia Profissional</span></>}
                    showBackButton={!initialData} 
                />
                
                <main className="flex-grow flex flex-col items-center justify-start px-4 pt-40 pb-20">
                    <div className="relative w-full max-w-xl">

                        {/* FOTO CENTRALIZADA - ESTILO GOOGLE PROFILE */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="relative w-32 h-32 md:w-40 md:h-40 p-[3px] rounded-full bg-gradient-to-tr from-[#34A853] via-[#FBBC05] via-[#EA4335] to-[#4285F4] shadow-2xl">
                                <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center p-[2px]">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                                        {avatar ? (
                                            <img src={avatar} alt={fullName} className="w-full h-full object-cover scale-110" />
                                        ) : (
                                            <UserIcon size={40} className="text-slate-600 opacity-50" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD BRANCO EDITORIAL */}
                        <section className="relative z-10 w-full bg-white rounded-[3rem] p-8 pt-24 shadow-2xl text-center border border-white/20">
                            <div className="space-y-6">
                                <p className="text-slate-900 text-xl md:text-2xl italic leading-relaxed font-medium px-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {bio ? `"${bio}"` : '"Sua essência editorial aparecerá aqui..."'}
                                </p>

                                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] tracking-[0.1em] uppercase font-bold">
                                    <MapPin size={12} className="text-[#D4AF37]" />
                                    {locationDisplay}
                                </div>

                                <div className="w-24 h-[1px] bg-[#D4AF37]/20 mx-auto" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 px-2">
                                    {/* WhatsApp - Estilo Oficial */}
                                    <a
                                        href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${fullName}, vi seu perfil e gostaria de um orçamento!`)}` : "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-bold bg-[#25D366] text-white shadow-lg active:scale-95 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageCircle size={22} strokeWidth={2.5} />
                                            <div className="flex flex-col items-start leading-none text-left">
                                                <span className="text-[11px] uppercase tracking-widest font-black">WhatsApp</span>
                                                <span className="text-[10px] font-medium opacity-80 italic">Orçamentos</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </a>

                                    {/* Instagram - Estilo Oficial */}
                                    <a
                                        href={instaLink ? (instaLink.startsWith('http') ? instaLink : `https://instagram.com/${instaLink.replace('@', '')}`) : "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-bold bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg active:scale-95 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Instagram size={22} strokeWidth={2.5} />
                                            <div className="flex flex-col items-start leading-none text-left">
                                                <span className="text-[11px] uppercase tracking-widest font-black">Instagram</span>
                                                <span className="text-[10px] font-medium opacity-80 italic">Portfólio</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}