'use client';
import React from 'react';
import {
  Instagram,
  MessageCircle,
  MapPin,
  Share2,
  User as UserIcon,
} from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import Image from 'next/image';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  photoPreview: string | null;
  cities: string[];
  showBackButton?: boolean;
}

export default function PhotographerProfileContent({
  fullName,
  username,
  miniBio,
  phone,
  instagram,
  photoPreview,
  cities,
  showBackButton = false,
}: ProfileContentProps) {
  const locationDisplay =
    cities.length > 0 ? cities.join(' • ') : 'SUA LOCALIZAÇÃO';

  return (
    <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden relative font-sans">
      <div className="absolute inset-0 z-0">
        <DynamicHeroBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col w-full min-h-screen">
        <EditorialHeader
          title={fullName || 'Seu Nome'}
          subtitle={
            <>
              @{username || 'usuario'} •{' '}
              <span className="font-bold border-b border-[#F3E5AB]/50 text-white">
                Fotografia Profissional
              </span>
            </>
          }
          showBackButton={showBackButton}
        />

        <main className="flex-grow flex flex-col items-center justify-start px-6 pt-20 pb-10">
          <div className="relative w-full max-w-xl">
            {/* FOTO ARREDONDADA */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="relative w-28 h-28 md:w-32 md:h-32 p-[2px] rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center p-[2px]">
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-900">
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt={fullName}
                        fill
                        className="object-cover transition-transform duration-700 hover:scale-110"
                        priority
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <UserIcon
                          size={32}
                          className="text-slate-500 opacity-50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD CHAMPANHE */}
            <section className="relative z-10 w-full bg-[#FFF9F0] rounded-[2.5rem] p-8 pt-20 shadow-2xl border border-white/20 text-center">
              <div className="space-y-5">
                <p className="text-slate-900 text-lg md:text-xl italic font-serif leading-relaxed px-2">
                  {miniBio
                    ? `"${miniBio}"`
                    : '"Sua essência editorial aparecerá aqui..."'}
                </p>

                <div className="flex items-center justify-center gap-1.5 text-[#D4AF37] text-[10px] md:text-[14px] tracking-[0.1em] font-semibold px-4">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="leading-relaxed">{locationDisplay}</span>
                </div>

                <div className="w-16 h-px bg-[#D4AF37]/20 mx-auto" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={
                      phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '#'
                    }
                    target="_blank"
                    className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-[#25D366] text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle size={28} />
                      <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[10px] md:text-[14px] uppercase font-bold">
                          WhatsApp
                        </span>
                        <span className="text-[9px] md:text-[12px] opacity-80 italic">
                          Orçamentos
                        </span>
                      </div>
                    </div>
                    <Share2 size={12} className="opacity-40" />
                  </a>

                  <a
                    href={
                      instagram
                        ? `https://instagram.com/${instagram.replace('@', '')}`
                        : '#'
                    }
                    target="_blank"
                    className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <Instagram size={28} />
                      <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[10px] md:text-[14px] uppercase font-bold">
                          Instagram
                        </span>
                        <span className="text-[9px] md:text-[12px] opacity-80 italic">
                          Portfólio
                        </span>
                      </div>
                    </div>
                    <Share2 size={12} className="opacity-40" />
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
