'use client';

import { GALLERY_MESSAGES } from '@/constants/messages';
import { Galeria } from '@/core/types/galeria';
import React from 'react';

interface GaleriaFooterProps {
  galeria: Galeria;
}

export default function GaleriaFooter({ galeria }: GaleriaFooterProps) {
  const whatsappLink = `https://wa.me/${galeria.photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER(galeria.title),
  )}`;
  return (
    <footer className="relative z-20 w-full mt-4 pt-6 border-t border-gold/20 bg-[#FFF9F0]">
      <div className="max-w-[1600px] mx-auto flex flex-col items-center gap-4">
        {/* 1. Botão Voltar ao Topo Minimalista */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex flex-col items-center gap-2 transition-all duration-500"
        >
          <div className="p-3 rounded-full border border-gold/30 group-hover:border-gold transition-all">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.5"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </div>
          <span className="text-[9px] md:text-[14px] tracking-wider  font-medium text-[#D4AF37]">
            Topo
          </span>
        </button>
        {/* 2. Bloco Central Editorial (Compactado) */}
        <div className="text-center space-y-2">
          <h3 className="italic text-2xl md:text-4xl text-slate-900 tracking-tight">
            {galeria.title}
          </h3>

          <div className="flex flex-row items-center justify-center mt-2">
            <p className="text-[12px] md:text-[16px] text-[#D4AF37]/80 font-medium pr-2">
              Fotos registradas
            </p>

            {/* Container Horizontal: Alinha "por" + Nome + Botões */}
            <div className="text-[12px] md:text-[16px] flex items-center gap-2 text-slate-500 italic  ">
              <span>por</span>

              <div className="flex items-center gap-4  py-1.5 not-italic">
                <span className="text-[12px] md:text-[16px] text-slate-900 font-semibold whitespace-nowrap">
                  {galeria?.photographer_name}
                </span>

                {/* Divisória sutil entre nome e ícones */}
                <div className="w-[1px] h-4 bg-slate-300" />

                <div className="flex items-center gap-3">
                  {galeria.photographer?.phone_contact && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 hover:text-[#25D366] transition-all"
                      aria-label="Entre em contato pelo WhatsApp com o fotógrafo"
                      title="Entre em contato pelo WhatsApp com o fotógrafo"
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  )}
                  {galeria.photographer?.instagram_link && (
                    <a
                      href={`https://instagram.com/${galeria.photographer.instagram_link.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 hover:text-[#25D366] transition-all"
                      aria-label="Visualizar Instagram do fotógrafo"
                      title="Visualizar Instagram do fotógrafo"
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  <a
                    href={`/${galeria.photographer?.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:text-[#D4AF37] transition-all"
                    aria-label="Visualizar perfil do fotógrafo"
                    title="Visualizar perfil do fotógrafo"
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full border-t border-slate-200/60 mt-2 pt-6 pb-4 px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col items-end gap-2 text-slate-600">
          <div className="text-[10px] md:text-[12px] tracking-wider font-semibold text-slate-800 font-sans uppercase">
            Powered by{' '}
            <a
              href={`https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <span className="text-[#D4AF37] italic tracking-normal text-xs md:text-sm ml-1 cursor-pointer">
                Sua Galeria de Fotos
              </span>
            </a>
          </div>
          <div className="text-[10px] md:text-[12px] tracking-widest font-sans font-medium">
            © {new Date().getFullYear()} — Todos os direitos reservados
          </div>
        </div>
      </div>
    </footer>
  );
}
