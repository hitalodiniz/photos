'use client';
import React from 'react';
import { Camera, Instagram, MessageCircle, MapPin, Share2 } from 'lucide-react';
import { DynamicHeroBackground, Footer, EditorialHeader } from '@/components/layout';

export default function PhotographerProfile() {
    const profile = {
        full_name: "Gabriel Alcantara",
        username: "gabriel.foto",
        mini_bio: "Capturando a essência de momentos únicos através de um olhar editorial e minimalista. Especialista em ensaios externos e eventos de luxo.",
        phone: "+55 (11) 99999-9999",
        instagram_url: "https://instagram.com",
        avatar_url: "/hero-bg-1.jpg",
        location: "São Paulo, SP"
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
            <DynamicHeroBackground />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Reduzi o padding superior do Header para ganhar espaço */}
                <EditorialHeader
                    title={profile.full_name}
                    subtitle={<>@{profile.username} • <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">Fotografia Profissional</span></>}
                    showBackButton={true}
                />
                <main className="flex-grow flex flex-col items-center justify-start px-4 pt-16 md:pt-20 pb-10">
                    {/* Aumentamos de max-w-lg (~512px) para max-w-2xl (~672px) para ganhar os 50% de largura */}
                    <div className="relative w-full max-w-4xl">

                        {/* FOTO CENTRALIZADA */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-[3px] border-[#F3E5AB]/60 p-0.5 shadow-2xl bg-black">
                                <div className="w-full h-full rounded-full overflow-hidden border border-white/10">
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO AMPLIADA */}
                        <section className="relative z-10 w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:px-16 md:py-10 shadow-2xl border border-white/50 text-center">

                            {/* Espaçador entre foto e texto */}
                            <div className="h-12 md:h-18" />

                            <div className="space-y-4">
                                <p
                                    className="text-slate-900 text-base md:text-[22px] italic leading-tight md:leading-relaxed font-medium"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    "{profile.mini_bio}"
                                </p>

                                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[9px] tracking-[0.1em] uppercase font-bold">
                                    <MapPin size={10} className="text-[#D4AF37]" />
                                    {profile.location}
                                </div>

                                <div className="w-24 h-[1px] bg-[#D4AF37]/20 mx-auto" />


                                <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-4 w-full">

                                    {/* Botão WhatsApp */}
                                    <a
                                        href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-xl font-bold 
      transition-all shadow-lg active:scale-95 text-xs md:text-sm tracking-widest bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900 whitespace-nowrap"
                                    >
                                        <MessageCircle size={18} />
                                        <span className="uppercase">WhatsApp</span>
                                        <span className="text-[12px] font-normal opacity-70">Orçamentos</span>

                                    </a>

                                    {/* Botão Instagram */}
                                    <a
                                        href={profile.instagram_url}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 md:py-4 rounded-xl font-bold 
      transition-all shadow-lg active:scale-95 text-xs md:text-sm tracking-widest bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900 whitespace-nowrap"
                                    >
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-4 w-full">
                                            <Instagram size={18} />
                                            <span className="uppercase">Instagram</span>
                                            <span className="text-[12px] font-normal opacity-70">Portfólio</span>
                                        </div>

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