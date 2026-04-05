import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Archive, Calendar, Home, Lock, MessageCircle } from 'lucide-react';
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
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { emitGaleriaEvent } from '@/core/services/galeria-stats.service';
import { Galeria } from '@/core/types/galeria';
import { InternalTrafficSync } from '@/hooks/useSyncInternalTraffic';
import { checkSubdomainPermission } from '@/core/services/profile.service';

import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { Footer } from '@/components/layout';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';

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

  // Busca galeria
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);
  if (!galeriaRaw) notFound();

  // Usa sempre o valor atual de use_subdomain direto do banco,
  // sem cache, para evitar divergência após downgrade.
  const hasSubdomain = await checkSubdomainPermission(username);
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

  // Verificamos se existe data de expiração e se ela já passou
  const isExpired =
    galeriaData.expires_at && new Date() > new Date(galeriaData.expires_at);

  const isOwner = userId === galeriaRaw.user_id;

  // Garante que os dados do fotógrafo (incluindo templates) sejam injetados
  const photographerProfile = galeriaRaw.photographer;
  if (photographerProfile) {
    galeriaData.photographer = photographerProfile;
  }
  console.log('galeriaData.is_archived', galeriaData.is_archived);
  if (galeriaData.is_archived || galeriaData.auto_archived) {
    return (
      <EditorialView
        title="Galeria Arquivada"
        subtitle={
          <>
            As memórias desta galeria foram{' '}
            <span className="font-semibold text-white italic">
              guardadas em segurança
            </span>
          </>
        }
      >
        {/* 🎯 SEÇÃO BRANCA DE CONTEÚDO */}
        <section className="w-full bg-white shadow-sm ">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12">
            {/* CABEÇALHO CENTRALIZADO */}
            <div className="text-left mb-8">
              <h2 className="text-3xl md:text-4xl font-semibold text-petroleum italic mb-2">
                Esta galeria não está mais acessível.
              </h2>
            </div>

            {/* GRID DE OPÇÕES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-2">
              {/* Opção 1: Contatar Profissional */}
              {galeriaData.photographer?.phone_contact && (
                <EditorialCard
                  title="Solicitar Reativação"
                  accentColor="gold"
                  icon={<MessageCircle size={32} strokeWidth={1.5} />}
                  items={[
                    'Converse diretamente com o profissional',
                    'Solicite a reativação da galeria',
                    'Acesso rápido via WhatsApp',
                  ]}
                >
                  <a
                    href={`https://wa.me/${galeriaData.photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá! Gostaria de solicitar o acesso à galeria arquivada:\n\n` +
                        `*Título:* ${galeriaData.title}\n` +
                        `*Data:* ${
                          galeriaData.date &&
                          !isNaN(Date.parse(galeriaData.date))
                            ? new Date(galeriaData.date).toLocaleDateString(
                                'pt-BR',
                              )
                            : 'Não informada'
                        }\n` +
                        `*Link:* ${resolveGalleryUrl(
                          galeriaData.photographer.username,
                          fullSlug,
                          hasSubdomain,
                          MAIN_DOMAIN,
                          process.env.NODE_ENV === 'production'
                            ? 'https'
                            : 'http',
                        )}\n\n` +
                        `Como posso proceder?`,
                    )}`}
                    target="_blank"
                    className="mt-auto w-full py-4 bg-[#25D366] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#20BA5A] transition-all"
                  >
                    <WhatsAppIcon className="w-4 h-4" /> Falar no WhatsApp
                  </a>
                </EditorialCard>
              )}

              {/* Opção 2: Voltar ao Perfil */}
              <EditorialCard
                title="Explorar Portfólio"
                accentColor="petroleum"
                icon={<Home size={32} strokeWidth={1.5} />}
                items={[
                  'Conheça outros trabalhos do profissional',
                  'Acesse galerias públicas disponíveis',
                  'Navegue pelo perfil completo',
                ]}
              >
                <Link
                  href={`/${galeriaData.photographer?.username}`}
                  className="mt-auto w-full py-4 bg-petroleum text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                  Visitar Perfil
                </Link>
              </EditorialCard>
            </div>
          </div>
        </section>
      </EditorialView>
    );
  }

  if (isExpired) {
    return (
      <EditorialView
        title="Acesso Encerrado"
        subtitle={
          <>
            Esta galeria atingiu o{' '}
            <span className="font-semibold text-white italic">
              prazo limite de visualização
            </span>
          </>
        }
      >
        {/* 🎯 SEÇÃO BRANCA DE CONTEÚDO */}
        <section className="w-full bg-white ">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12">
            {/* CABEÇALHO CENTRALIZADO */}
            <div className="text-left mb-6 -pt-6">
              <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 px-6 py-3 rounded-full w-fit mx-auto shadow-sm">
                <Calendar size={18} className="text-gold" />
                <p className="text-[14px] text-petroleum uppercase tracking-widest font-semibold whitespace-nowrap">
                  O link desta galeria expirou em{' '}
                  <span className="text-gold">
                    {new Date(galeriaData.expires_at).toLocaleDateString(
                      'pt-BR',
                    )}
                  </span>
                </p>
              </div>
            </div>

            {/* GRID DE OPÇÕES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opção 1: Contatar Profissional */}
              {galeriaData.photographer?.phone_contact && (
                <EditorialCard
                  title="Solicitar Novo Acesso"
                  accentColor="gold"
                  icon={<MessageCircle size={32} strokeWidth={1.5} />}
                  items={[
                    'Entre em contato com o profissional',
                    'Solicite a renovação do prazo',
                    'Acesso rápido via WhatsApp',
                  ]}
                >
                  <a
                    href={`https://wa.me/${galeriaData.photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá! Gostaria de solicitar novo acesso à galeria:\n\n` +
                        `*Título:* ${galeriaData.title}\n` +
                        `*Data de Expiração:* ${new Date(galeriaData.expires_at).toLocaleDateString('pt-BR')}\n\n` +
                        `Como posso renovar o acesso?`,
                    )}`}
                    target="_blank"
                    className="mt-auto w-full py-4 bg-[#25D366] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#20BA5A] transition-all"
                  >
                    <WhatsAppIcon className="w-4 h-4" /> Falar no WhatsApp
                  </a>
                </EditorialCard>
              )}

              {/* Opção 2: Voltar ao Perfil */}
              <EditorialCard
                title="Explorar Portfólio"
                accentColor="petroleum"
                icon={<Home size={32} strokeWidth={1.5} />}
                items={[
                  'Conheça outros trabalhos do profissional',
                  'Acesse galerias públicas disponíveis',
                  'Navegue pelo perfil completo',
                ]}
              >
                <Link
                  href={`/${galeriaData.photographer?.username}`}
                  className="mt-auto w-full py-4 bg-petroleum text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                  Visitar Perfil
                </Link>
              </EditorialCard>
            </div>
          </div>
        </section>
      </EditorialView>
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

  console.log('error', error);
  if (error && error !== 'TOKEN_NOT_FOUND') {
    return (
      <GoogleAuthError
        errorType={error}
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
