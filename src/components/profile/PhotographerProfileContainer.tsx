'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { profileService } from '@/core/services/profile.service';
import PhotographerProfileContent from '../ui/PhotographerProfileContent';
import LoadingScreen from '../ui/LoadingScreen';
import { profile } from 'console';

interface Props {
  username: string;
}
export default function PhotographerProfileContainer({ username }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 🎯 O "Back" resolve o dado independente da URL
        const data = await profileService.getPublicProfile(username);
        setProfile(data);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username]);

  if (loading) {
    return <LoadingScreen message="Carregando o perfil do fotógrafo" />;
  }

  // 🎯 Se o serviço retornar null ou o usuário desativou o subdomínio, 404
  if (!profile) {
    return notFound();
  }

  return (
    <PhotographerProfileContent
      fullName={profile.full_name}
      username={profile.username}
      miniBio={profile.mini_bio}
      phone={profile.phone_contact}
      instagram={profile.instagram_link}
      photoPreview={profile.profile_picture_url}
      cities={profile.operating_cities || []}
    />
  );
}
