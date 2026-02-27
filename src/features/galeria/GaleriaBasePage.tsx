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
// FIX 2: Removido import de PlanKey — não é mais necessário aqui.
// PlanProvider agora recebe o profile completo em vez de planKey string bruta.
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { emitGaleriaEvent } from '@/core/services/galeria-stats.service';
import { Galeria } from '@/core/types/galeria';
import { InternalTrafficSync } from '@/hooks/useSyncInternalTraffic';

import { getAuthenticatedUser } from '@/core/services/auth-context.service';

const MAIN_DOMAIN = (
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'
).split(':')[0];

interface GaleriaBaseProps {
  params: { username: string; slug?: string[] };
  isSubdomainContext?: boolean;
}

export default async function GaleriaBasePage({
  params,
  isSubdomainContext = false,
}: GaleriaBaseProps) {
  const { username, slug } = params;

  // CASO 1: HOME (Perfil do Fotógrafo)
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

  const hasSubdomain = !!galeriaRaw.photographer?.use_subdomain;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // REGRA 1: Rota clássica mas fotógrafo TEM subdomínio → redireciona
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

  // REGRA 2: Subdomínio mas fotógrafo NÃO TEM mais permissão → redireciona
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

  const userId = await getAuthenticatedUser().then((user) => user.userId);

  const galeriaData = formatGalleryData(galeriaRaw, username);

  const photographerProfile = galeriaRaw.photographer;
  if (photographerProfile) {
    galeriaData.photographer = photographerProfile;
  }

  if (galeriaData.is_archived) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 text-center animate-in fade-in duration-1000">
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

  const cookieStore = await cookies();
  const sessionCookieName = `view-sid-${galeriaData.id}`;
  let sessionId = cookieStore.get(sessionCookieName)?.value;
  let isNewSession = false;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    isNewSession = true;
  }

  await emitGaleriaEvent({
    galeria: galeriaRaw as unknown as Galeria,
    eventType: 'view',
    metadata: {
      context: isSubdomainContext ? 'subdomain' : 'main',
      sessionId: sessionId,
      isNewSession: isNewSession,
      userId: userId || null,
    },
  });

  const needsPassword = !galeriaData.is_public;
  const needsLead = galeriaData.leads_enabled;

  if (needsPassword || needsLead) {
    const hasAuthCookie = cookieStore.get(
      `galeria-${galeriaData.id}-auth`,
    )?.value;
    const hasLeadCookie = cookieStore.get(
      `galeria-${galeriaData.id}-lead`,
    )?.value;

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

  const { photos, error } = await fetchPhotosByGalleryId(galeriaData.id);

  // TOKEN_NOT_FOUND não é mais um erro - a função já tentou API Key automaticamente
  if (error === 'TOKEN_NOT_FOUND') {
    // Continua a execução normalmente
  }

  if (error && error !== 'TOKEN_NOT_FOUND') {
    return (
      <GoogleAuthError
        errorType={error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <GoogleAuthError
        errorType={error === 'TOKEN_NOT_FOUND' ? null : error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  return (
    <>
      <InternalTrafficSync userId={userId} />
      {/*
       * FIX 2: <PlanProvider profile={galeriaRaw.photographer}> em vez de
       *        <PlanProvider planKey={planKey as PlanKey}>
       *
       * MOTIVO: Passar planKey como string bruta pula toda a lógica de
       * trial/expiração do PlanContext. Se o fotógrafo está em trial expirado,
       * o PlanContext não consegue detectar isso com apenas a string 'PRO'.
       * galeriaRaw.photographer é o Profile completo (com is_trial,
       * plan_trial_expires etc.), então o PlanProvider processa corretamente
       * as permissões reais do fotógrafo cujas fotos estão sendo exibidas.
       *
       * TAMBÉM REMOVIDO: const planKey = galeriaData.photographer.plan_key || 'FREE'
       * e o import de PlanKey — ambos ficam órfãos após esta correção.
       */}
      <PlanProvider profile={galeriaRaw.photographer}>
        <GaleriaView galeria={galeriaData} photos={photos} />
      </PlanProvider>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<any> }) {
  const { username, slug } = await params;
  if (slug?.some((s: string) => s.includes('.'))) {
    return {};
  }

  if (!slug || (Array.isArray(slug) && slug.length === 0)) {
    return await getPhotographerMetadata(username);
  }

  const fullSlug = `${username}/${slug.join('/')}`;
  return await getGalleryMetadata(fullSlug);
}
