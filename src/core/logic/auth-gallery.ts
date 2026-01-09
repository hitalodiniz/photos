import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function checkGalleryAccess(galeriaId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`galeria-${galeriaId}-auth`)?.value;

  if (!token) return false;

  try {
    const SECRET = new TextEncoder().encode(process.env.JWT_GALLERY_SECRET);
    const { payload } = await jwtVerify(token, SECRET);

    return payload.galeriaId === galeriaId;
  } catch (err) {
    console.log(err);
    return false;
  }
}
