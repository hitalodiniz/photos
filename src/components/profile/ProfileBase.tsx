// src/components/photographer/PhotographerProfileBase.tsx
import { notFound, redirect } from 'next/navigation';
import PhotographerContainer from './ProfileContainer';
import { getPublicProfile } from '@/core/services/profile.service';
import { resolveGalleryUrl } from '@/core/utils/url-helper';
import { PlanProvider } from '@/core/context/PlanContext';

const MAIN_DOMAIN = (
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'
).split(':')[0];

interface ProfileBaseProps {
  username: string;
  isSubdomainContext: boolean;
}

export default async function PhotographerProfileBase({
  username,
  isSubdomainContext,
}: ProfileBaseProps) {
  // Busca o perfil (usa o cache que criamos)
  const profile = await getPublicProfile(username);

  // 1. Se o fotógrafo não existe no banco -> 404
  if (!profile) notFound();

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // 2. REGRA DE SUBDOMÍNIO (Acesso via hitalo.site.com)
  if (isSubdomainContext) {
    // Se o cara tentou acessar via subdomínio mas NÃO tem a permissão ativa -> 404
    if (!profile.use_subdomain) {
      notFound();
    }
    // Se está tudo certo, renderiza o container que você já tem
    return (
      <PlanProvider profile={profile}>
        <PhotographerContainer username={username} initialProfile={profile} />
      </PlanProvider>
    );
  }

  // 3. REGRA DE ROTA CLÁssica (Acesso via site.com/hitalo)
  if (!isSubdomainContext) {
    // Se ele tem subdomínio ativo, mandamos ele para lá (SEO)
    if (profile.use_subdomain) {
      const correctUrl = resolveGalleryUrl(
        username,
        '',
        true,
        MAIN_DOMAIN,
        protocol,
      );
      redirect(correctUrl);
    }
    // Se ele NÃO tem subdomínio, ele pode usar a rota clássica normalmente
    return (
      <PlanProvider profile={profile}>
        <PhotographerContainer username={username} initialProfile={profile} />
      </PlanProvider>
    );
  }

  return (
    <PlanProvider profile={profile}>
      <PhotographerContainer username={username} initialProfile={profile} />
    </PlanProvider>
  );
}
