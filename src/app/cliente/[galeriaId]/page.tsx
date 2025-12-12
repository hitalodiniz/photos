
// src/app/cliente/[galeriaId]/page.tsx

'use server';

import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { mockGaleriaPrivada, mockPhotos } from '@/mocks/data';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PasswordPrompt } from '@/components/PasswordPrompt';
import { verifyAccessToken, issueAccessToken } from '@/lib/galeriaToken';

const CORRECT_MOCK_PASSWORD = 'senha123';
const ACCESS_COOKIE_KEY = 'galeria_acesso_';
const MOCK_GALERIA_ID_TESTE = 'g-123';

const mockGetPhotosFromSession = async () => mockPhotos;

interface GaleriaPageProps {
  params: Promise<{ galeriaId: string }>; // Next 15: params é Promise
}

export default async function GaleriaPage({ params }: GaleriaPageProps) {
  // 1) Captura do ID da URL
  const { galeriaId } = await params;
  const fullSlug = galeriaId;

  if (!galeriaId || galeriaId !== MOCK_GALERIA_ID_TESTE) {
    notFound();
  }

  // 2) MOCK: galeria
  const galeria = mockGaleriaPrivada;
  const isPrivate = !galeria.isPublic;

  // 3) Checagem de acesso por cookie (token assinado)
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(ACCESS_COOKIE_KEY + galeriaId);
  const hasValidAccess = !!accessCookie?.value && verifyAccessToken(accessCookie.value, galeriaId);

  // 4) Controle de acesso
  if (isPrivate && !hasValidAccess) {
    
    const action = authenticateGaleria.bind(null, galeriaId, fullSlug);

    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">

<PasswordPrompt
  galeriaTitle={galeria.title}
  formAction={authenticateGaleria.bind(null, galeriaId, fullSlug)}
/>

      </main>
    );

  }

  // 5) Renderiza as fotos
  const photos = await mockGetPhotosFromSession();
  return <PhotoGrid galeria={galeria} photos={photos} />;
}

// =======================================================================
// SERVER ACTION — autenticação com token assinado
// =======================================================================
export const mockAuthenticateAction = async (
  galeriaId: string,
  fullSlug: string,
  passwordAttempt: string
) => {
  'use server';
  const { issueAccessToken } = await import('@/lib/galeriaToken'); 
  const isProd = process.env.NODE_ENV === 'production';

  if (passwordAttempt === CORRECT_MOCK_PASSWORD) {
    const cookieStore = await cookies();

    // Emite token e grava em cookie HttpOnly
    const token = issueAccessToken(galeriaId);
    cookieStore.set(ACCESS_COOKIE_KEY + galeriaId, token, {
      httpOnly: true,
  secure: isProd ? true : false, // ← Em localhost fica false
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
  path: '/', // ← amplo só para depuração
    });

    redirect(`/cliente/${fullSlug}`);
  } else {
    return { success: false, message: 'Senha incorreta. Tente "senha123".' };
  }
};


export async function authenticateGaleria(
  galeriaId: string,
  fullSlug: string,
  formData: FormData
) {
  const passwordAttempt = String(formData.get('password') || '');

  if (passwordAttempt !== CORRECT_MOCK_PASSWORD) {
    return { success: false, message: 'Senha incorreta. Tente "senha123".' };
  }

  // Emite token e define cookie (Next 15: cookies() é assíncrono)
  const cookieStore = await cookies();
  const token = issueAccessToken(galeriaId);

  const isProd = process.env.NODE_ENV === 'production';

  // Em localhost (HTTP), `secure: false`
  cookieStore.set(ACCESS_COOKIE_KEY + galeriaId, token, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/', // amplo para depurar; depois restringimos
  });

  // Redireciona (não usar `return redirect`)
  redirect(`/cliente/${fullSlug}`);
}

``
