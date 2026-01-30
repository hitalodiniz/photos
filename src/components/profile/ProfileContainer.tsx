'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import PhotographerContent from './ProfileContent';
import * as profileService from '@/core/services/profile.service';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface Props {
  username: string;
  initialProfile?: any;
}

export default function PhotographerContainer({
  username,
  initialProfile,
}: Props) {
  const [profile, setProfile] = useState<any>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);

  useEffect(() => {
    if (initialProfile) return;

    async function loadData() {
      try {
        const data = await profileService.getPublicProfile(username);
        setProfile(data);
      } catch {
        // Erro silencioso; o notFound abaixo cobre o fallback visual
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username, initialProfile]);

  // 1. Enquanto carrega o perfil básico, não mostramos nada (ou um loader simples)
  // pois o PhotographerContent já possui seu próprio LoadingScreen interno
  if (loading) {
    return null;
  }

  // 2. Se terminou de carregar e não tem perfil, dispara o 404
  if (!profile) {
    return notFound();
  }

  // 3. Agora é seguro renderizar, pois o 'profile' certamente existe
  return (
    <PhotographerContent
      fullName={profile.full_name}
      username={profile.username}
      miniBio={profile.mini_bio}
      phone={profile.phone_contact}
      instagram={profile.instagram_link}
      photoPreview={profile.profile_picture_url}
      cities={profile.operating_cities || []}
      website={profile.website}
      backgroundUrl={profile.background_url}
      useSubdomain={profile.use_subdomain}
    />
  );
}
