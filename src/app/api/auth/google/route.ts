import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Se o Google redirecionar para cá sem esses itens, o erro acontece
  if (!code || !state) {
    console.error('DEBUG: Google retornou sem code ou state');
    return NextResponse.redirect(
      new URL('/?error=missing_parameters', request.url),
    );
  }

  // Pegamos a URL do projeto bdgqiy do seu .env.local
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // http://localhost:3000

  const supabaseCallbackUrl = new URL(`${supabaseUrl}/auth/v1/callback`);

  supabaseCallbackUrl.searchParams.set('code', code);
  supabaseCallbackUrl.searchParams.set('state', state);

  // O redirecionamento final deve ser para o domínio principal (localhost:3000)
  // para que o cookie .localhost seja gravado corretamente
  supabaseCallbackUrl.searchParams.set(
    'redirect_to',
    `${baseUrl}/api/auth/callback`,
  );

  return NextResponse.redirect(supabaseCallbackUrl.toString());
}
