// src/app/api/validate-link/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ valid: false }, { status: 400 });

  try {
    // O servidor faz a requisição. O Google não bloqueia o servidor como bloqueia o browser.
    const res = await fetch(url, { method: 'HEAD' });

    // Se for Google Drive e o arquivo for privado/inexistente, ele retorna 403 ou 404
    return NextResponse.json({ valid: res.ok });
  } catch (error) {
    return NextResponse.json({ valid: false });
  }
}
