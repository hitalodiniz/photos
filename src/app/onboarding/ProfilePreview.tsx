'use client';

import React from 'react';
import { Instagram, MessageCircle, MapPin, Share2, User as UserIcon } from 'lucide-react';
import { Footer, EditorialHeader, DynamicHeroBackground } from '@/components/layout';

interface ProfilePreviewProps {
    fullName: string;
    username: string;
    miniBio: string;
    phone: string;
    instagram: string;
    photoPreview: string | null;
    cities: string[];
}

export default function ProfilePreview({
    fullName, username, miniBio, phone, instagram, photoPreview, cities
}: ProfilePreviewProps) {

    const locationDisplay = cities.length > 0
        ? (cities.length <= 2 ? cities.join(' • ') : `${cities.slice(0, 2).join(', ')} + ${cities.length - 2}`)
        : "SUA LOCALIZAÇÃO";

    const btnStyle = "w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-bold transition-all shadow-lg bg-[#F3E5AB] text-slate-900";

    return (
        /* min-h-full e relative garantem que o fundo preto e a imagem cubram toda a lateral direita */
        <div className="min-h-full w-full flex flex-col bg-black overflow-x-hidden">
            
            {/* O Background Dinâmico agora é forçado a preencher todo o espaço absoluto sem deixar frestas no topo ou direita */}
            <div className="absolute inset-0 z-0">
                <DynamicHeroBackground />
                {/* Overlay de gradiente aprimorado para cobrir as bordas superiores */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/80 pointer-events-none" />
            </div>

            <div className="relative z-10 flex flex-col w-full h-auto">
                {/* Header ajustado para encostar no topo sem margens */}
                <EditorialHeader
                    title={fullName || "Hitalo Diniz"}
                    subtitle={<>@{username || "hitalodiniz"} • <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">Fotografia Profissional</span></>}
                    showBackButton={false}
                />

                <main className="flex-grow flex flex-col items-center justify-start px-6 pt-32 pb-20">
                    <div className="relative w-full max-w-xl">

                        {/* FOTO CENTRALIZADA - Estilo Google Profile */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-[4px] border-[#F3E5AB] p-1 shadow-2xl bg-black">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt={fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={40} className="text-slate-600 opacity-50" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CARD BRANCO EDITORIAL */}
                        <section className="relative z-10 w-full bg-white rounded-[3rem] p-8 pt-24 shadow-2xl text-center border border-white/20">
                            <div className="space-y-6">
                                <p className="text-slate-900 text-xl md:text-2xl italic leading-relaxed font-medium px-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {miniBio ? `"${miniBio}"` : '"Sua essência editorial aparecerá aqui..."'}
                                </p>

                                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] tracking-[0.1em] uppercase font-bold">
                                    <MapPin size={12} className="text-[#D4AF37]" />
                                    {locationDisplay}
                                </div>

                                <div className="w-24 h-[1px] bg-[#D4AF37]/20 mx-auto" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                    <div className={`${btnStyle} opacity-90 hover:opacity-100 cursor-default select-none`}>
                                        <div className="flex items-center gap-3">
                                            <MessageCircle size={20} />
                                            <div className="flex flex-col items-start leading-none text-left">
                                                <span className="text-[10px] uppercase tracking-tighter font-black">WhatsApp</span>
                                                <span className="text-[9px] font-normal opacity-70">Orçamentos</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-30" />
                                    </div>

                                    <div className={`${btnStyle} opacity-90 hover:opacity-100 cursor-default select-none`}>
                                        <div className="flex items-center gap-3">
                                            <Instagram size={20} />
                                            <div className="flex flex-col items-start leading-none text-left">
                                                <span className="text-[10px] uppercase tracking-tighter font-black">Instagram</span>
                                                <span className="text-[9px] font-normal opacity-70">Portfólio</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-30" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>

                <div className="w-full mt-auto bg-black/40 backdrop-blur-md">
                    <Footer />
                </div>
            </div>
        </div>
    );
}