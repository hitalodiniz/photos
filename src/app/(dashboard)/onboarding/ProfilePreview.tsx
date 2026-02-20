'use client';
import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';
import ProfileContent from '@/components/profile/ProfileContent';
import { getPublicProfile } from '@/core/services/profile.service';

export default function Photographer({ initialData }: { initialData?: any }) {
  const params = useParams();
  const [profile, setProfile] = useState<any>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    // Se já temos initialData (modo Preview), não buscamos no banco
    if (initialData) {
      setProfile(initialData);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      if (!params.username) return;
      try {
        const { data } = await getPublicProfile(params.username as string);

        if (!data) {
          throw new Error('Perfil não encontrado no sistema.');
        }
        setProfile(data);
      } catch (error) {
        window.console.error('Erro capturado no fetch:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [params.username, initialData]);

  // Loading State - Mantendo o fundo preto padrão do editorial
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-champagne italic">
        Carregando Editorial...
      </div>
    );
  }

  if (!profile)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-champagne">
        Perfil não encontrado.
      </div>
    );

  // Normalização de campos (Banco vs Formulário)
  const fullName = profile.full_name || profile.fullName;
  const username = profile.username;
  const bio = profile.mini_bio || profile.miniBio;
  const avatar =
    profile.profile_picture_url || profile.avatar_url || profile.photoPreview;
  const whatsapp = profile.phone_contact || profile.phone;
  const instaLink =
    profile.instagram_link || profile.instagram_url || profile.instagram;

  // Lógica de Localização Inteligente
  const cities = profile.operating_cities || profile.cities || [];
  const website = profile.website || profile.website;
  const backgroundUrl = profile.background_url || profile.background_url;
  const useSubdomain =
    profile.use_subdomain !== undefined ? profile.use_subdomain : true;

  const specialties = (() => {
    const raw = profile.specialty;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  })();

  const profileForPermission =
    profile.plan_key != null ? { plan_key: profile.plan_key } : undefined;

  return (
    <div className="w-full min-h-screen bg-black">
      <ProfileContent
        fullName={fullName}
        username={username}
        miniBio={bio}
        phone={whatsapp}
        instagram={instaLink}
        photoPreview={avatar}
        cities={cities}
        specialties={specialties}
        website={website}
        backgroundUrl={backgroundUrl}
        useSubdomain={useSubdomain}
        profile={profileForPermission}
      />
    </div>
  );
}
