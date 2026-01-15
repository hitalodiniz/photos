'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import PhotographerProfileContent from '../ui/PhotographerProfileContent';
import * as profileService from '@/core/services/profile.service';
import LoadingScreen from '../ui/LoadingScreen';

interface Props {
  username: string;
}

export default function PhotographerProfileContainer({ username }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await profileService.getPublicProfile(username);

        setProfile(data);
      } catch (err) {
        console.error('Erro na chamada:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username]);

  // 1. Enquanto carrega, mostra um feedback (ou null para não mostrar nada)
  if (loading) {
    return <LoadingScreen message="Carregando perfil" />;
  }

  // 2. Se terminou de carregar e não tem perfil, dispara o 404
  if (!profile) {
    console.log('3. Perfil não encontrado, disparando notFound()');
    return notFound();
  }

  // 3. Agora é seguro renderizar, pois o 'profile' certamente existe
  return (
    <PhotographerProfileContent
      fullName={profile.full_name}
      username={profile.username}
      miniBio={profile.mini_bio}
      phone={profile.phone_contact}
      instagram={profile.instagram_link}
      photoPreview={profile.profile_picture_url}
      cities={profile.operating_cities || []}
      website={profile.website}
      backgroundUrl={profile.background_url}
    />
  );
}
