import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PhotoViewClient from './PhotoViewClient';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
    const { googleId } = await params;
    const sParams = await searchParams;
    const slug = sParams.s;

    // Limpeza preventiva do slug para o SEO
    const cleanedSlug = slug?.startsWith('/') ? slug.substring(1) : slug;

    // Busca rápida para o card do WhatsApp
    const { data: galeria } = await supabase
        .from('tb_galerias')
        .select('title, photographer:tb_profiles(full_name)')
        .eq('slug', cleanedSlug)
        .single();

    const title = `${galeria?.title || 'Fotografia'} • ${galeria?.photographer?.full_name || 'Hitalo Diniz'}`;
    const photoUrl = `https://lh3.googleusercontent.com/d/$$${googleId}=s800`;

    return {
        title,
        openGraph: {
            title,
            description: "Toque para visualizar esta fotografia em alta resolução.",
            images: [{ url: photoUrl, width: 800, height: 600 }],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            images: [photoUrl],
        }
    };
}

export default async function Page({ params, searchParams }: any) {
    const resParams = await params;
    const resSearch = await searchParams;
    
    return <PhotoViewClient googleId={resParams.googleId} slug={resSearch.s} />;
}