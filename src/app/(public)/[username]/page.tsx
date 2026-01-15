import React from 'react';
import PhotographerContainer from '@/components/photographer/PhotographerContainer';
import { Metadata } from 'next';
import { getPublicProfile } from '@/core/services/profile.service';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    // Busca os dados do banco (Supabase)
    const profile = await getPublicProfile(username);

    // Pega o full_name da coluna do banco.
    // Se por algum motivo o perfil não for encontrado, usamos o username formatado como fallback.
    const titleName =
      profile?.full_name ||
      username
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    return {
      title: `Perfil de ${titleName}`,
      description: profile?.mini_bio || `Conheça o portfólio de ${titleName}`,
      openGraph: {
        title: `${titleName} | Perfil Editorial`,
        description: profile?.mini_bio,
        images: [profile?.photo_url || '/default-og.jpg'],
        type: 'profile',
      },
    };
  } catch (error) {
    console.error('Erro ao gerar metadata:', error);
    return { title: 'Perfil Editorial' };
  }
}

export default function UserPage({ params }: Props) {
  const resolvedParams = React.use(params);
  return <PhotographerContainer username={resolvedParams.username} />;
}
