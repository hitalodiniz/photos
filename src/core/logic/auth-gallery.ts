import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function checkGalleryAccess(galeriaId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`galeria-${galeriaId}-auth`)?.value;

  if (!token) {
    console.log(`[AUTH] Cookie não encontrado para galeria: ${galeriaId}`);
    return false;
  }

  try {
    // 🎯 Use a mesma lógica de fallback da função de autenticação
    const secretString =
      process.env.JWT_GALLERY_SECRET || 'chave-padrao-de-seguranca-32';
    const SECRET = new TextEncoder().encode(secretString);

    const { payload } = await jwtVerify(token, SECRET);

    const isMatch = String(payload.galeriaId) === String(galeriaId);
    if (!isMatch)
      console.log(
        `[AUTH] Payload ID ${payload.galeriaId} não bate com ${galeriaId}`,
      );

    return isMatch;
  } catch (err) {
    console.error('[AUTH] Erro na verificação do JWT:', err);
    return false;
  }
}
