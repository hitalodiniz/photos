'use client';
import React, { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import {PhotographerProfile} from '@/components/profile'; 

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PhotographerPage({ params }: { params: Promise<{ username: string }> }) {
    const resolvedParams = use(params);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            const { data } = await supabase.from('tb_profiles').select('*').eq('username', resolvedParams.username).single();
            setProfile(data);
            setLoading(false);
        }
        fetchProfile();
    }, [resolvedParams.username]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">Carregando...</div>;
    if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-[#F3E5AB]">Perfil não encontrado.</div>;

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