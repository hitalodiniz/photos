'use client';

import { GALLERY_MESSAGES } from '@/core/config/messages';
import { Photographer } from '@/core/types/galeria';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';
import { usePlan } from '@/core/context/PlanContext';
import { Globe } from 'lucide-react';
import React from 'react';

interface GaleriaFooterProps {
  photographer: Photographer;
  title?: string; // Título opcional (se for no perfil, pode ser o nome do fotógrafo ou "Portfólio")
  showTopButton?: boolean;
}

export default function GaleriaFooter({
  photographer,
  title,
  showTopButton = true,
}: GaleriaFooterProps) {
  const { planKey, permissions } = usePlan(); // 🛡️ Verificação de Branding
  // 🛡️ Lógica de Níveis Progressivos (Igual ao Avatar)
  const hasWhatsApp = ['START', 'PLUS', 'PRO', 'PREMIUM'].includes(planKey);
  const hasInstagram = ['PLUS', 'PRO', 'PREMIUM'].includes(planKey);
  const hasProfile = ['PRO', 'PREMIUM'].includes(planKey);
  const hasWebsite = planKey === 'PREMIUM';

  // 1. Lógica de Links Segura
  const whatsappNumber = photographer?.phone_contact?.replace(/\D/g, '') || '';
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    title
      ? GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER(title)
      : 'Olá! Vi seu trabalho e gostaria de mais informações.',
  )}`;

  const profileLink = getCreatorProfileUrl(photographer);

  return (
    <footer className="relative z-20 w-full mt-4 pt-6 bg-[#111827] border-t border-white/5">
      <div className="max-w-[1600px] mx-auto flex flex-col items-center gap-6">
        {/* 1. Botão Voltar ao Topo */}
        {showTopButton && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex flex-col items-center gap-2 transition-all duration-500"
          >
            <div className="p-3 rounded-full border border-white/10 group-hover:border-[#F3E5AB] group-hover:bg-white/5 transition-all">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F3E5AB"
                strokeWidth="2"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#F3E5AB]/60 group-hover:text-[#F3E5AB]">
              Topo
            </span>
          </button>
        )}

        {/* 2. Bloco Central Editorial */}
        <div className="text-center space-y-3 px-4">
          {title && (
            <h3 className="italic text-lg md:text-3xl text-white tracking-tight font-light">
              {title}
            </h3>
          )}

          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 text-white/70 italic">
              <span className="text-[13px] md:text-[16px]">Registrado por</span>

              <div className="flex items-center gap-4 py-1.5 not-italic">
                <span className="text-[13px] md:text-[18px] text-white font-semibold whitespace-nowrap tracking-wide">
                  {photographer?.full_name}
                </span>

                <div className="w-[1px] h-4 bg-white/10" />

                <div className="flex items-center gap-4">
                  {/* WHATSAPP (Nível: START) */}
                  {hasWhatsApp && photographer?.phone_contact && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-[#25D366] transition-all"
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  )}
                  {/* INSTAGRAM (Nível: PLUS) */}
                  {hasInstagram && photographer?.instagram_link && (
                    <a
                      href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-all"
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0.013-3.583 0.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  {/* PERFIL INTERNO (Nível: FREE) */}
                  <a
                    href={profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-[#F3E5AB] transition-all"
                  >
                    <svg
                      width="18"
                      height="18"
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

                  {/* WEBSITE EXTERNO (Nível: PREMIUM) */}
                  {hasWebsite && photographer?.website && (
                    <a
                      href={photographer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-blue-400 transition-all"
                      title="Visitar Website"
                    >
                      <Globe size={18} strokeWidth={2.5} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Rodapé Inferior */}
      <div className="w-full border-t border-white/5 mt-2 pt-6 pb-6 px-8 bg-black/20">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-white/30">
          <div className="text-[10px] md:text-[11px] tracking-[0.2em] font-medium uppercase text-center md:text-left">
            © {new Date().getFullYear()} — Todos os direitos reservados
          </div>

          {/* 🛡️ TRAVA DE BRANDING: Só exibe se NÃO puder remover */}
          {!permissions.removeBranding ? (
            <div className="text-[10px] md:text-[12px] tracking-[0.2em] font-semibold uppercase flex items-center gap-2 animate-in fade-in duration-700">
              <span>Powered by</span>
              <a
                href={`https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <span className="text-[#F3E5AB] italic tracking-tight text-sm md:text-base group-hover:text-white transition-colors ml-1">
                  Sua Galeria
                </span>
              </a>
            </div>
          ) : (
            /* Fallback Minimalista quando o Branding é removido */
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/10">
              Galeria Profissional
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
