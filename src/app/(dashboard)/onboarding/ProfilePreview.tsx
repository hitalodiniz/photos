'use client';
import React, { useEffect, useState } from 'react';

import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import PhotographerProfileContent from '@/components/ui/PhotographerProfileContent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PhotographerProfile({
  initialData,
}: {
  initialData?: any;
}) {
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
        const { data, error } = await supabase
          .from('tb_profiles')
          .select('*')
          .eq('username', params.username)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [params.username, initialData]);

  if (!profile)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">
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
  // Exemplo de uso no Preview lateral
  return (
    <PhotographerProfileContent
      fullName={fullName}
      username={username}
      miniBio={bio}
      phone={whatsapp}
      instagram={instaLink}
      photoPreview={avatar} // URL da imagem temporária do upload
      cities={cities}
      showBackButton={false}
    />
  );
}
