'use client';
import React from 'react';
import { Instagram, MessageCircle, MapPin, Share2, User as UserIcon } from 'lucide-react';
import { Footer, EditorialHeader, DynamicHeroBackground } from '@/components/layout';

interface PhotographerProfileProps {
    fullName: string;
    username: string;
    miniBio: string;
    phone: string;
    instagram: string;
    photoPreview: string | null;
    cities: string[];
    showBackButton?: boolean;
}

export default function PhotographerProfile({
    fullName, username, miniBio, phone, instagram, photoPreview, cities, showBackButton = false
}: PhotographerProfileProps) {

    // Lógica de Localização Inteligente
    const locationDisplay = cities.length > 0
        ? (cities.length <= 2 ? cities.join(' • ') : `${cities.slice(0, 2).join(', ')} + ${cities.length - 2}`)
        : "SUA LOCALIZAÇÃO";

    return (
        <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden relative">
            <div className="absolute inset-0 z-0">
                <DynamicHeroBackground />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/80 pointer-events-none" />
            </div>

            <div className="relative z-10 flex flex-col w-full h-auto min-h-screen">
                <EditorialHeader
                    title={fullName || "Seu Nome"}
                    subtitle={<>@{username || "usuario"} • <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">Fotografia Profissional</span></>}
                    showBackButton={showBackButton}
                />

                <main className="flex-grow flex flex-col items-center justify-start px-6 pt-60 pb-40">
                    <div className="relative w-full max-w-xl">
                        {/* FOTO CENTRALIZADA - ESTILO GOOGLE PROFILE */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="relative w-32 h-32 md:w-40 md:h-40 p-[3px] rounded-full bg-gradient-to-tr from-[#34A853] via-[#FBBC05] via-[#EA4335] to-[#4285F4] shadow-2xl">
                                <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center p-[2px]">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt={fullName} className="w-full h-full object-cover scale-110" />
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
                                    {miniBio ? `"${miniBio}"` : '"Sua essência editorial aparecerá aqui..."'}
                                </p>

                                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] tracking-[0.1em] uppercase font-bold">
                                    <MapPin size={12} className="text-[#D4AF37]" />
                                    {locationDisplay}
                                </div>

                                <div className="w-24 h-[1px] bg-[#D4AF37]/20 mx-auto" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                    {/* Botão WhatsApp Oficial */}
                                    <a
                                        href={phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${fullName}, vi seu perfil e gostaria de um orçamento!`)}` : "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-bold bg-[#25D366] text-white shadow-lg active:scale-95 group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageCircle size={22} strokeWidth={2.5} />
                                            <div className="flex flex-col items-start leading-tight text-left">
                                                <span className="text-[11px] uppercase tracking-widest font-black">WhatsApp</span>
                                                <span className="text-[10px] font-medium opacity-80 italic">Orçamentos</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-40" />
                                    </a>

                                    {/* Botão Instagram Oficial */}
                                    <a
                                        href={instagram ? (instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`) : "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-bold bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg active:scale-95 group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Instagram size={22} strokeWidth={2.5} />
                                            <div className="flex flex-col items-start leading-tight text-left">
                                                <span className="text-[11px] uppercase tracking-widest font-black">Instagram</span>
                                                <span className="text-[10px] font-medium opacity-80 italic">Portfólio</span>
                                            </div>
                                        </div>
                                        <Share2 size={14} className="opacity-40" />
                                    </a>
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