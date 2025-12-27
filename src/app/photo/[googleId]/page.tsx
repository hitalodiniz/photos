import { Metadata } from 'next';
import PhotoViewClient from './PhotoViewClient';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
    const { googleId } = await params;
    const sParams = await searchParams;
    const slug = sParams.s;

    return {
        title: `Visualização Editorial | ${slug || ''}`,
        openGraph: {
            images: [`https://lh3.googleusercontent.com/d/${googleId}=s0`],
        },
    };
}

export default async function Page({ params, searchParams }: any) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    
    return (
        <PhotoViewClient 
            googleId={resolvedParams.googleId} 
            slug={resolvedSearchParams.s} 
        />
    );
}