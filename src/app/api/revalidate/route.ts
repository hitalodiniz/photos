import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { folderId, photoId } = await request.json();

    if (folderId) revalidateTag(`drive-photos-${folderId}`);
    if (photoId) revalidateTag(`cover-${photoId}`);

    return NextResponse.json({ revalidated: true });
  } catch (err) {
    return NextResponse.json({ message: 'Erro ao revalidar' }, { status: 500 });
  }
}
