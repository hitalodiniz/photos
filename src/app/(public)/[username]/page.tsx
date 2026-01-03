'use client';

import React, { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PhotographerProfile } from '@/components/profile';
import { notFound } from 'next/navigation'; // Importação necessária

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PhotographerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from('tb_profiles')
        .select('*')
        .eq('username', resolvedParams.username)
        .single();

      setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [resolvedParams.username]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">
        Carregando perfil do fotógrafo...
      </div>
    );

  /**
   * TRAVA DE SEGURANÇA:
   * Se o perfil não existe OU se o fotógrafo tem use_subdomain como falso,
   * disparamos o notFound() para exibir a página 404 padrão do Next.js.
   */
  if (!profile || profile.use_subdomain === false) {
    return notFound();
  }

  return (
    <PhotographerProfile
      fullName={profile.full_name}
      username={profile.username}
      miniBio={profile.mini_bio}
      phone={profile.phone_contact}
      instagram={profile.instagram_link}
      photoPreview={profile.profile_picture_url}
      cities={profile.operating_cities || []}
      showBackButton={true}
    />
  );
}
