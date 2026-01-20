/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Verificação de acesso a galerias protegidas por senha
 * - Validação de JWT de autenticação de galeria
 * - Verificação de cookies de acesso
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Bug pode permitir acesso não autorizado a galerias privadas
 * - Pode expor dados sensíveis de galerias
 * - Pode quebrar validação de senha
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda validação JWT
 * 4. Teste extensivamente
 * 5. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function checkGalleryAccess(galeriaId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`galeria-${galeriaId}-auth`)?.value;

  if (!token) {
    return false;
  }

  try {
    // 🎯 Use a mesma lógica de fallback da função de autenticação
    const secretString =
      process.env.JWT_GALLERY_SECRET || 'chave-padrao-de-seguranca-32';
    const SECRET = new TextEncoder().encode(secretString);

    const { payload } = await jwtVerify(token, SECRET);

    const isMatch = String(payload.galeriaId) === String(galeriaId);

    return isMatch;
  } catch (err) {
    console.error('[AUTH] Erro na verificação do JWT:', err);
    return false;
  }
}
