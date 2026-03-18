import { revalidateUserCache } from '@/actions/revalidate.actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId, secret } = await request.json();

  // Proteção para não deixar aberto em produção
  if (secret !== process.env.TEST_REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await revalidateUserCache(userId);
  return NextResponse.json({ revalidated: true });
}
