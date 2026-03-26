import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { addSecondsToSaoPauloIso } from '@/core/utils/date-time';
/**
 * Busca o ID da pasta-mãe (parent) de um arquivo no Google Drive
 * @param fileId O ID do arquivo selecionado no Google Picker.
 * @param userId O ID do usuário logado (autor).
 * @returns O ID da pasta-mãe ou null se houver falha.
 */
export async function getParentFolderIdServerService(
  fileId: string,
  userId: string,
): Promise<string | null> {
  // 1. RENOVA O ACCESS TOKEN NO SERVIDOR
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error(
      'ERRO Server: Falha ao obter Access Token para buscar pasta-mãe.',
    );
    return null;
  }

  // 2. CHAMA A API DO DRIVE NO SERVIDOR (segura contra expiração de token)
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      // Não armazenamos em cache, pois o token é sensível ao tempo.
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API (Server): Falha ao buscar metadados:',
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();

    const parents = data.parents;

    if (parents && parents.length > 0) {
      return parents[0]; // Retorna o ID da primeira pasta-mãe
    }

    return null;
  } catch (error) {
    console.error('Erro de rede ao chamar a API do Drive (Server):', error);
    return null;
  }
}

/**
 * Busca o nome de uma pasta no Google Drive
 * @param folderId O ID da pasta.
 * @param userId O ID do usuário logado (autor).
 * @returns O nome da pasta ou null em caso de falha.
 */
export async function getDriveFolderNameService(
  folderId: string,
  userId: string,
): Promise<string | null> {
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error(
      'ERRO Server: Falha ao obter Access Token para buscar nome da pasta.',
    );
    return null;
  }

  // Buscar o campo 'name' da pasta
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API (Server): Falha ao buscar nome da pasta:',
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();

    return data.name || null;
  } catch (error) {
    console.error(
      'Erro de rede ao chamar a API do Drive (Server) para buscar nome:',
      error,
    );
    return null;
  }
}

/**
 * Verifica se a pasta possui permissão de leitura pública (anyone + reader)
 * e se a pasta pertence ao usuário
 * 
 * @returns Objeto com informações sobre a pasta:
 * - isPublic: se a pasta é pública
 * - isOwner: se o usuário é dono da pasta
 * - folderLink: link da pasta no Google Drive
 */
export async function checkFolderPublicPermissionService(
  folderId: string,
  userId: string,
): Promise<{
  isPublic: boolean;
  isOwner: boolean;
  folderLink: string;
}> {
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error('ERRO Server: Token não disponível para checar permissão.');
    return {
      isPublic: false,
      isOwner: false,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`,
    };
  }

  // 🎯 Busca informações completas: permissions, owners, webViewLink
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=permissions,owners,explicitlyTrashed,webViewLink`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API: Falha ao checar permissões:',
        response.status,
      );
      return {
        isPublic: false,
        isOwner: false,
        folderLink: `https://drive.google.com/drive/folders/${folderId}`,
      };
    }

    const data = await response.json();

    // Se a pasta estiver na lixeira, tratamos como não pública/inválida
    if (data.explicitlyTrashed) {
      return {
        isPublic: false,
        isOwner: false,
        folderLink: data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
      };
    }

    // 🎯 Verifica se o usuário é dono da pasta
    // Busca o email do usuário no Supabase para comparar
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email;
    const isOwner = data.owners?.some(
      (owner: any) => owner.emailAddress === userEmail,
    ) || false;

    // Verifica se existe a permissão de "anyone" com papel de "reader"
    const isPublic = data.permissions?.some(
      (p: any) => p.type === 'anyone' && p.role === 'reader',
    ) || false;

    return {
      isPublic: !!isPublic,
      isOwner: !!isOwner,
      folderLink: data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
    };
  } catch (error) {
    console.error('Erro de rede ao checar permissões pública:', error);
    return {
      isPublic: false,
      isOwner: false,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`,
    };
  }
}

/**
 * ⚠️⚠️⚠️ FUNÇÃO CRÍTICA DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Obtém token válido do Google para acesso ao Google Drive.
 * Gerencia refresh automático de tokens, validação de expiração e cache.
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Bug pode quebrar acesso ao Google Drive
 * - Pode expor tokens inválidos
 * - Pode causar falhas no Google Picker
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda refresh token flow do Google
 * 4. Teste extensivamente
 * 5. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */
export async function getValidGoogleTokenService(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Busca os tokens e a validade no banco
  const { data: profile, error } = await supabase
    .from('tb_profiles')
    .select(
      'google_refresh_token, google_access_token, google_token_expires_at, google_auth_status',
    )
    .eq('id', userId)
    .single();

  // 🎯 Com a estratégia dual (API Key + OAuth), não tratamos ausência de token como erro
  // Retorna null para que o sistema possa tentar com API Key
  if (error) {
    // console.log(`[getValidGoogleTokenService] Erro ao buscar perfil para userId: ${userId}:`, error.message);
    return null;
  }

  if (!profile?.google_refresh_token) {
    // console.log(`[getValidGoogleTokenService] Refresh token não encontrado para userId: ${userId}. Usuário precisa fazer login novamente para usar Google Picker (que requer access token OAuth).`);
    return null;
  }

  // 🎯 Verifica se o status de autenticação indica problema
  if (profile.google_auth_status === 'revoked' || profile.google_auth_status === 'expired') {
    // console.log(`[getValidGoogleTokenService] Status de autenticação indica token revogado/expirado para userId: ${userId}. Usuário precisa fazer login novamente para obter novo refresh token.`);
    return null;
  }

  // 2. VERIFICAÇÃO DE CACHE: O token no banco ainda é válido?
  // Adicionamos uma margem de segurança de 5 minutos (300.000 ms) para evitar renovação desnecessária
  if (profile.google_access_token && profile.google_token_expires_at) {
    try {
      const expiresAt = new Date(profile.google_token_expires_at).getTime();
      const now = nowFn().getTime();
      const margin = 5 * 60 * 1000; // 5 minutos em milissegundos

      // Verifica se o token ainda é válido (com margem de 5 minutos)
      if (expiresAt > now + margin) {
        // console.log(`[getValidGoogleTokenService] Token em cache ainda válido para userId: ${userId} (expira em ${Math.round((expiresAt - now) / 1000 / 60)} minutos)`);
        return profile.google_access_token;
      } else {
        // console.log(`[getValidGoogleTokenService] Token em cache expirado para userId: ${userId}. Renovando...`);
      }
    } catch (dateError) {
      console.warn(`[getValidGoogleTokenService] Erro ao validar data de expiração para userId: ${userId}:`, dateError);
      // Continua para renovar o token
    }
  }

  // 3. Se expirou ou não existe, renovamos manualmente
  try {
    // console.log(`[getValidGoogleTokenService] Renovando token para userId: ${userId}...`);
    
    let response: Response;
    try {
      // 🎯 USA HELPER DE RATE LIMITING: Previne 429 errors com retry e backoff
      const { fetchGoogleToken } = await import('@/core/utils/google-oauth-throttle');
      
      response = await fetchGoogleToken(
        profile.google_refresh_token,
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
      );
    } catch (fetchErr: any) {
      // 🎯 Verifica status primeiro (mais específico)
      if (fetchErr.status === 408) {
        throw new Error('Erro de conexão com o servidor do Google (timeout).');
      }
      // Se for rate limit mesmo após retry, lança erro específico
      if (fetchErr.status === 429) {
        throw new Error('Muitas requisições ao Google. Aguarde alguns segundos e tente novamente.');
      }
      // Verifica mensagem de timeout
      if (fetchErr.message?.includes('timeout') || fetchErr.message?.includes('Request timeout')) {
        throw new Error('Erro de conexão com o servidor do Google (timeout).');
      }
      throw fetchErr;
    }
    
    // const fetchDuration = nowFn().getTime() - startTime;
    /* console.log(`[getValidGoogleTokenService] Resposta do Google recebida em ${fetchDuration}ms:`, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    }); */

    const data = await response.json();

    if (
      data.error === 'invalid_grant' ||
      data.error === 'invalid_request' ||
      data.error === 'refresh_token_already_used'
    ) {
      // 🎯 TRATAMENTO: Token inválido - limpa do banco e marca como expirado
      console.error(`[google.service] Token inválido para userId: ${userId}`, data.error);
      
      try {
        // Limpa o refresh_token inválido do banco e marca status como expirado
        await supabase
          .from('tb_profiles')
          .update({
            google_refresh_token: null,
            google_access_token: null,
            google_token_expires_at: null,
            google_auth_status: 'expired', // Marca como expirado - indica que precisa reautenticar
          })
          .eq('id', userId);
        // console.log(`[google.service] Refresh token inválido removido do banco e status atualizado para userId: ${userId}. Usuário precisa fazer login novamente para obter novo refresh token.`);
      } catch (dbError) {
        console.error('[google.service] Erro ao limpar token do banco:', dbError);
      }

      // Retorna null - sem refresh token, não podemos gerar novos access tokens
      // O Google Picker precisa de access token OAuth válido, então o usuário precisa reautenticar
      // console.log(`[getValidGoogleTokenService] Token inválido para userId: ${userId}. Usuário precisa fazer login novamente para usar Google Picker.`);
      return null;
    }

    // Se não há access_token (e não é erro de token inválido já tratado acima), lança erro
    if (!data.access_token) {
      throw new Error('Falha ao renovar o acesso com o Google.');
    }

    // 4. PERSISTÊNCIA: Salva os novos dados para a próxima chamada
    const expiresInSeconds = data.expires_in || 3600; // Default 1 hora se não especificado
    const updates: any = {
      google_access_token: data.access_token,
      // Google retorna 'expires_in' em segundos (geralmente 3600)
      google_token_expires_at: addSecondsToSaoPauloIso(expiresInSeconds),
      google_auth_status: 'active', // Marca como ativo após renovação bem-sucedida
    };

    // Importante: Se o Google rotacionar o refresh_token, salvamos também
    if (data.refresh_token) {
      updates.google_refresh_token = data.refresh_token;
      // console.log(`[getValidGoogleTokenService] Google rotacionou o refresh_token para userId: ${userId}`);
    }

    const { error: updateError } = await supabase
      .from('tb_profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error(`[getValidGoogleTokenService] Erro ao salvar token renovado para userId: ${userId}:`, updateError);
      // Ainda retorna o token mesmo se falhar ao salvar (pode ser usado imediatamente)
    } else {
      // console.log(`[getValidGoogleTokenService] Token renovado e salvo com sucesso para userId: ${userId}`);
    }

    return data.access_token;
  } catch (fetchError: any) {
    // 🎯 Re-lança erros específicos que já foram tratados no catch interno
    // (timeout, rate limit, etc.) - esses erros já têm mensagens específicas
    if (fetchError instanceof Error) {
      const errorMessage = fetchError.message;
      if (
        errorMessage.includes('(timeout)') ||
        errorMessage.includes('Muitas requisições ao Google') ||
        errorMessage === 'Falha ao renovar o acesso com o Google.'
      ) {
        throw fetchError; // Re-lança erros já tratados
      }
    }
    
    // 🎯 Verifica status antes de tratar como erro de rede genérico
    if (fetchError?.status === 408) {
      throw new Error('Erro de conexão com o servidor do Google (timeout).');
    }
    
    // Erros de rede (fetch rejeitado) devem lançar erro específico
    // Quando fetch() é rejeitado (não é erro de resposta HTTP, mas erro de rede)
    if (fetchError instanceof Error) {
      // Verifica se é um erro de rede (fetch rejeitado, não erro HTTP)
      const isNetworkError = 
        fetchError.message.includes('fetch') || 
        fetchError.message.includes('network') ||
        fetchError.message.includes('Network') ||
        fetchError.message.includes('Failed to fetch') ||
        (fetchError.message.includes('Falha de Rede') && !fetchError.status);
      
      if (isNetworkError) {
        throw new Error('Erro de conexão com o servidor do Google.');
      }
    }
    
    // Para outros erros, retorna null para permitir fallback com API Key
    console.error(`[getValidGoogleTokenService] Erro ao renovar token para userId: ${userId}:`, {
      error: fetchError?.message,
      stack: fetchError?.stack,
    });
    
    return null;
  }
}
