import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchPhotosByGalleryId,
} from '@/core/logic/galeria-logic';
import GaleriaView from './GaleriaView';
import GalleryAccessPortal from './GaleriaAcessoPortal';
import { resolveGalleryUrl } from '@/core/utils/url-helper';
import {
  getGalleryMetadata,
  getPhotographerMetadata,
} from '@/core/utils/metadata-helper';
import GoogleAuthError from '@/components/auth/GoogleAuthError';
import PhotographerProfileBase from '@/components/profile/ProfileBase';
import { PlanProvider } from '@/core/context/PlanContext';
import { PlanKey } from '@/core/config/plans';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

const MAIN_DOMAIN = (
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'
).split(':')[0];

interface GaleriaBaseProps {
  params: { username: string; slug?: string[] };
  isSubdomainContext?: boolean; // Diferencial técnico
}

export default async function GaleriaBasePage({
  params,
  isSubdomainContext = false,
}: GaleriaBaseProps) {
  const { username, slug } = params;

  // CASO 1: HOME (Perfil do Fotógrafo)
  // Se o slug não existe ou está vazio, renderizamos o Perfil
  if (!slug || (Array.isArray(slug) && slug.length === 0)) {
    return (
      <PhotographerProfileBase
        username={username}
        isSubdomainContext={isSubdomainContext}
      />
    );
  }

  // CASO 2: GALERIA
  const fullSlug = `${username}/${slug.join('/')}`;

  const galeriaRaw = await fetchGalleryBySlug(fullSlug);
  if (!galeriaRaw) notFound();

  // LÓGICA DE REDIRECIONAMENTO INTELIGENTE
  const hasSubdomain = !!galeriaRaw.photographer?.use_subdomain;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // REGRA 1: Se estou na rota clássica mas o cara TEM subdomínio -> REDIRECIONA PARA SUBDOMÍNIO
  if (!isSubdomainContext && hasSubdomain) {
    const correctUrl = resolveGalleryUrl(
      username,
      fullSlug,
      true,
      MAIN_DOMAIN,
      protocol,
    );
    redirect(correctUrl);
  }

  // REGRA 2: Se estou no subdomínio mas o cara NÃO TEM mais permissão -> REDIRECIONA PARA ROTA CLÁSSICA
  if (isSubdomainContext && !hasSubdomain) {
    const fallbackUrl = resolveGalleryUrl(
      username,
      fullSlug,
      false,
      MAIN_DOMAIN,
      protocol,
    );
    redirect(fallbackUrl);
  }

  // ... (Restante da sua lógica de formatação, senha e Drive igual ao seu código)
  const galeriaData = formatGalleryData(galeriaRaw, username);

  // Garante que os dados do fotógrafo (incluindo templates) sejam injetados
  const photographerProfile = galeriaRaw.photographer;
  if (photographerProfile) {
    galeriaData.photographer = photographerProfile;
  }

  if (galeriaData.is_archived) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 text-center animate-in fade-in duration-1000">
        {/* Ícone de Arquivo com Estilo Minimalista */}
        <div className="w-px h-24 bg-gradient-to-b from-champagne/40 to-transparent mb-12" />

        <div className="max-w-2xl space-y-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-petroleum/60 font-bold">
            Galeria Arquivada
          </h2>

          <h3 className="text-3xl md:text-4xl font-light text-petroleum leading-tight tracking-tight">
            As memórias desta galeria foram guardadas em segurança.
          </h3>

          <p className="text-[13px] md:text-[15px] leading-relaxed text-petroleum/70 font-medium max-w-lg mx-auto italic">
            Para solicitar o acesso novamente entre em contato diretamente com o
            profissional.
          </p>

          <div className="w-12 h-px bg-gold/30 mx-auto mt-12" />

          {/* Ações de Contato */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-6">
            {galeriaData.photographer?.phone_contact && (
              <a
                href={`https://wa.me/${galeriaData.photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá! Gostaria de solicitar o acesso à galeria arquivada:\n\n` +
                    `*Título:* ${galeriaData.title}\n` +
                    `*Data:* ${
                      galeriaData.date && !isNaN(Date.parse(galeriaData.date))
                        ? new Date(galeriaData.date).toLocaleDateString('pt-BR')
                        : 'Não informada'
                    }\n` +
                    `*Link:* ${resolveGalleryUrl(
                      galeriaData.photographer.username,
                      fullSlug,
                      !!galeriaData.photographer.use_subdomain,
                      MAIN_DOMAIN,
                      process.env.NODE_ENV === 'production' ? 'https' : 'http',
                    )}\n\n` +
                    `Como posso proceder?`,
                )}`}
                target="_blank"
                className="btn-luxury-primary flex items-center gap-3 px-8 h-12 rounded-luxury text-[11px] uppercase font-bold tracking-widest"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Falar com o Profissional
              </a>
            )}

            <Link
              href={`/${galeriaData.photographer?.username}`}
              className="px-8 h-12 rounded-luxury border border-petroleum/10 text-petroleum text-[11px] uppercase font-bold tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center"
            >
              Visitar Perfil
            </Link>
          </div>
        </div>

        <div className="w-px h-24 bg-gradient-to-t from-champagne/40 to-transparent mt-20" />
      </div>
    );
  }

  // 🎯 LÓGICA DE ACESSO PROTEGIDO (Servidor)
  const cookieStore = await cookies();
  const needsPassword = !galeriaData.is_public;
  const needsLead = galeriaData.leads_enabled;

  if (needsPassword || needsLead) {
    const hasAuthCookie = cookieStore.get(
      `galeria-${galeriaData.id}-auth`,
    )?.value;
    const hasLeadCookie = cookieStore.get(
      `galeria-${galeriaData.id}-lead`,
    )?.value;

    // Se precisa de senha e não tem o cookie de senha...
    // OU se precisa de lead e não tem o cookie de lead...
    if ((needsPassword && !hasAuthCookie) || (needsLead && !hasLeadCookie)) {
      return (
        <GalleryAccessPortal
          galeria={galeriaData}
          fullSlug={fullSlug}
          isOpen={true}
        />
      );
    }
  }

  // 🎯 CACHE: Usa fetchPhotosByGalleryId para cache com tag photos-[galleryId]
  // A função já gerencia API Key e OAuth internamente (Estratégia Dual)
  const { photos, error } = await fetchPhotosByGalleryId(galeriaData.id);

  const planKey = galeriaData.photographer.plan_key || 'FREE';

  // TOKEN_NOT_FOUND não é mais um erro - a função já tentou API Key automaticamente
  // Se retornar TOKEN_NOT_FOUND, significa que ambas as estratégias falharam
  // Mas ainda assim tentamos exibir o que foi encontrado
  if (error === 'TOKEN_NOT_FOUND') {
    // console.log('[GaleriaBasePage] Token não encontrado, mas a busca via API Key já foi tentada. Verificando se há fotos disponíveis...');
    // Continua a execução normalmente - pode haver fotos mesmo sem token
  }

  // Apenas exibe erro se for um erro real que impede o acesso (PERMISSION_DENIED, GALLERY_NOT_FOUND, etc)
  if (error && error !== 'TOKEN_NOT_FOUND') {
    /* console.log('[GaleriaBasePage] Erro ao buscar fotos:', {
      galeriaId: galeriaData.id,
      error,
      photosCount: photos?.length || 0,
    }); */

    return (
      <GoogleAuthError
        errorType={error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  // Se não há fotos, pode ser pasta vazia ou inacessível
  if (!photos || photos.length === 0) {
    /* console.log('[GaleriaBasePage] Nenhuma foto encontrada na galeria:', {
      galeriaId: galeriaData.id,
      folderId: galeriaData.drive_folder_id,
      error: error || 'nenhum',
    }); */

    return (
      <GoogleAuthError
        errorType={error === 'TOKEN_NOT_FOUND' ? null : error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  return (
    <PlanProvider planKey={planKey as PlanKey}>
      <GaleriaView galeria={galeriaData} photos={photos} />
    </PlanProvider>
  );
}

export async function generateMetadata({ params }: { params: Promise<any> }) {
  const { username, slug } = await params;
  // Ignora se o slug parecer um arquivo técnico
  if (slug?.some((s: string) => s.includes('.'))) {
    return {};
  }

  // 1. Se NÃO houver slug, buscamos metadados do FOTÓGRAFO
  if (!slug || (Array.isArray(slug) && slug.length === 0)) {
    return await getPhotographerMetadata(username);
  }

  // 2. Se HOUVER slug, buscamos metadados da GALERIA
  const fullSlug = `${username}/${slug.join('/')}`;
  return await getGalleryMetadata(fullSlug);
}
