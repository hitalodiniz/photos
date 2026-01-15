'use client';
import React, { useEffect } from 'react';
import {
  Instagram,
  MapPin,
  Share2,
  User as UserIcon,
  Globe,
  ArrowUpRight,
} from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import Image from 'next/image';
import { GALLERY_MESSAGES } from '@/constants/messages';
import WhatsAppIcon from './WhatsAppIcon';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  website?: string;
  photoPreview: string | null;
  cities: string[];
  showBackButton?: boolean;
  backgroundUrl?: string;
}

export default function PhotographerProfileContent({
  fullName,
  username,
  miniBio,
  phone,
  instagram,
  website,
  photoPreview,
  cities,
  backgroundUrl,
}: ProfileContentProps) {
  useEffect(() => {
    if (fullName) {
      document.title = `${fullName} Fotógrafo - Sua Galeria de Fotos`;
    }
    return () => {
      document.title = process.env.NEXT_PUBLIC_TITLE_DEFAULT || 'Galeria';
    };
  }, [fullName]);

  const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER_DIRETO(),
  )}`;

  // Filtra quantos links de contato existem para ajustar o layout dinamicamente
  const activeLinksCount = [phone, instagram, website].filter(Boolean).length;

  return (
    <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden relative font-sans">
      <div className="absolute inset-0 z-0">
        <DynamicHeroBackground bgImage={backgroundUrl} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col w-full min-h-screen">
        <EditorialHeader
          title={fullName || 'Seu Nome'}
          showBackButton={false}
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
            <section className="relative z-10 w-full bg-[#FFF9F0] rounded-[1rem] p-8 pt-20 shadow-2xl border border-white/20 text-center">
              <div className="space-y-5">
                <p className="text-slate-900 text-lg md:text-xl italic leading-relaxed px-2">
                  {miniBio
                    ? `"${miniBio}"`
                    : '"Sua essência editorial aparecerá aqui..."'}
                </p>

                {/* Localização */}
                {cities && cities.length > 0 && (
                  <div className="flex flex-col items-center gap-2 px-6 max-w-md mx-auto">
                    <div className="flex items-center gap-1.5 text-[#D4AF37]">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="text-[10px] tracking-wider uppercase font-semibold">
                        Cidades de Atuação
                      </span>
                    </div>

                    <p className="text-slate-700 text-[11px] md:text-[13px] leading-relaxed font-medium text-center">
                      {cities.map((city, index) => (
                        <React.Fragment key={city}>
                          <span className="whitespace-nowrap">{city}</span>
                          {index < cities.length - 1 && (
                            <span className="mx-2 text-[#D4AF37]/40 text-[8px] md:text-[10px] inline-block align-middle">
                              •
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                )}

                <div className="w-16 h-px bg-[#D4AF37]/20 mx-auto" />

                {/* BOTÕES DE CONTATO CONDICIONAIS */}
                {/* Container de Botões Dinâmico */}
                <div
                  className={`grid gap-2 pt-2 w-full transition-all duration-500 ${
                    activeLinksCount === 3
                      ? 'grid-cols-3'
                      : activeLinksCount === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-1 max-w-[280px] mx-auto'
                  }`}
                >
                  {/* WHATSAPP */}
                  {phone && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#25D366] text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <WhatsAppIcon className="text-white w-5 h-5 md:w-6 md:h-6" />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[9px] md:text-[11px] uppercase font-bold tracking-tight">
                          WhatsApp
                        </span>
                        <span className="text-[7px] md:text-[9px] opacity-80 italic">
                          Contato
                        </span>
                      </div>
                    </a>
                  )}

                  {/* INSTAGRAM */}
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Instagram size={20} className="md:w-6 md:h-6" />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[9px] md:text-[11px] uppercase font-bold tracking-tight">
                          Instagram
                        </span>
                        <span className="text-[7px] md:text-[9px] opacity-80 italic">
                          Portfólio
                        </span>
                      </div>
                    </a>
                  )}

                  {/* WEBSITE */}
                  {website && (
                    <a
                      href={
                        website.startsWith('http')
                          ? website
                          : `https://${website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-900 text-white shadow-md border border-white/10 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Globe
                        size={20}
                        className="text-[#F3E5AB] md:w-6 md:h-6"
                      />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[9px] md:text-[11px] uppercase font-bold tracking-tight text-[#F3E5AB]">
                          Website
                        </span>
                        <span className="text-[7px] md:text-[9px] opacity-80 italic">
                          Oficial
                        </span>
                      </div>
                    </a>
                  )}
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
