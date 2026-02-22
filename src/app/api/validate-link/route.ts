// src/app/api/validate-link/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ valid: false }, { status: 400 });

  try {
    // Garante URL absoluta e protocolo suportado
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Primeiro tenta HEAD (mais leve)
    const headRes = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
    });

    if (headRes.ok) {
      return NextResponse.json({ valid: true });
    }

    // Fallback para GET: alguns links do Drive não respondem bem em HEAD
    const getRes = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });

    return NextResponse.json({ valid: getRes.ok });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
