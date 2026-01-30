import { autoPurgeTrashAction } from '@/actions/galeria.actions';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verifica se a requisição vem realmente do Cron da Vercel (Segurança)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const result = await autoPurgeTrashAction();

  return NextResponse.json(result);
}
