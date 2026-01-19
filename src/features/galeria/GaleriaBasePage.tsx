// Exemplo de caminho: src/features/galeria/GaleriaBasePage.tsx
'use server';
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
  fetchPhotosByGalleryId,
} from '@/core/logic/galeria-logic';
import GaleriaView from './GaleriaView';
import PasswordPrompt from './PasswordPrompt';
import { getDirectGoogleUrl, resolveGalleryUrl } from '@/core/utils/url-helper';
import {
  getGalleryMetadata,
  getPhotographerMetadata,
} from '@/lib/gallery/metadata-helper';
import GoogleAuthError from '@/components/auth/GoogleAuthError';
import PhotographerProfileBase from '@/components/photographer/PhotographerProfileBase';

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
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const savedToken = cookieStore.get(`galeria-${galeriaData.id}-auth`)?.value;

    // IMPORTANTE: Se você salvou um JWT, você precisa decodificá-lo ou,
    // para simplificar agora, verifique apenas se o cookie EXISTE.
    // Já que o cookie só é gerado se a senha estiver correta na Action.
    if (!savedToken) {
      return (
        <PasswordPrompt
          galeria={galeriaData}
          fullSlug={fullSlug}
          coverImageUrl={getDirectGoogleUrl(galeriaData.cover_image_url, '1000')}
        />
      );
    }
  }

  // 🎯 CACHE: Usa fetchPhotosByGalleryId para cache com tag photos-[galleryId]
  // A função já gerencia API Key e OAuth internamente (Estratégia Dual)
  const { photos, error } = await fetchPhotosByGalleryId(galeriaData.id);

  // TOKEN_NOT_FOUND não é mais um erro - a função já tentou API Key automaticamente
  // Se retornar TOKEN_NOT_FOUND, significa que ambas as estratégias falharam
  // Mas ainda assim tentamos exibir o que foi encontrado
  if (error === 'TOKEN_NOT_FOUND') {
    console.log('[GaleriaBasePage] Token não encontrado, mas a busca via API Key já foi tentada. Verificando se há fotos disponíveis...');
    // Continua a execução normalmente - pode haver fotos mesmo sem token
  }

  // Apenas exibe erro se for um erro real que impede o acesso (PERMISSION_DENIED, GALLERY_NOT_FOUND, etc)
  if (error && error !== 'TOKEN_NOT_FOUND') {
    console.log('[GaleriaBasePage] Erro ao buscar fotos:', {
      galeriaId: galeriaData.id,
      error,
      photosCount: photos?.length || 0,
    });

    return (
      <GoogleAuthError
        errorType={error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  // Se não há fotos, pode ser pasta vazia ou inacessível
  if (!photos || photos.length === 0) {
    console.log('[GaleriaBasePage] Nenhuma foto encontrada na galeria:', {
      galeriaId: galeriaData.id,
      folderId: galeriaData.drive_folder_id,
      error: error || 'nenhum',
    });

    return (
      <GoogleAuthError
        errorType={error === 'TOKEN_NOT_FOUND' ? null : error}
        photographerName={galeriaData.photographer_name || 'o autor'}
      />
    );
  }

  return <GaleriaView galeria={galeriaData} photos={photos} />;
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


