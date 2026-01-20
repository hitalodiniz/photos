import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { redirect } from 'next/navigation';
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
 */
export async function checkFolderPublicPermissionService(
  folderId: string,
  userId: string,
): Promise<boolean> {
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error('ERRO Server: Token não disponível para checar permissão.');
    return false;
  }

  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=permissions,explicitlyTrashed`;

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
      return false;
    }

    const data = await response.json();

    // Se a pasta estiver na lixeira, tratamos como não pública/inválida
    if (data.explicitlyTrashed) return false;

    // Verifica se existe a permissão de "anyone" com papel de "reader"
    const isPublic = data.permissions?.some(
      (p: any) => p.type === 'anyone' && p.role === 'reader',
    );

    return !!isPublic;
  } catch (error) {
    console.error('Erro de rede ao checar permissões pública:', error);
    return false;
  }
}

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
    console.log(`[getValidGoogleTokenService] Erro ao buscar perfil para userId: ${userId}:`, error.message);
    return null;
  }

  if (!profile?.google_refresh_token) {
    console.log(`[getValidGoogleTokenService] Refresh token não encontrado para userId: ${userId}. Usuário precisa fazer login novamente para usar Google Picker (que requer access token OAuth).`);
    return null;
  }

  // 🎯 Verifica se o status de autenticação indica problema
  if (profile.google_auth_status === 'revoked' || profile.google_auth_status === 'expired') {
    console.log(`[getValidGoogleTokenService] Status de autenticação indica token revogado/expirado para userId: ${userId}. Usuário precisa fazer login novamente para obter novo refresh token.`);
    return null;
  }

  // 2. VERIFICAÇÃO DE CACHE: O token no banco ainda é válido?
  // Adicionamos uma margem de segurança de 5 minutos (300.000 ms) para evitar renovação desnecessária
  if (profile.google_access_token && profile.google_token_expires_at) {
    try {
      const expiresAt = new Date(profile.google_token_expires_at).getTime();
      const now = Date.now();
      const margin = 5 * 60 * 1000; // 5 minutos em milissegundos

      // Verifica se o token ainda é válido (com margem de 5 minutos)
      if (expiresAt > now + margin) {
        console.log(`[getValidGoogleTokenService] Token em cache ainda válido para userId: ${userId} (expira em ${Math.round((expiresAt - now) / 1000 / 60)} minutos)`);
        return profile.google_access_token;
      } else {
        console.log(`[getValidGoogleTokenService] Token em cache expirado para userId: ${userId}. Renovando...`);
      }
    } catch (dateError) {
      console.warn(`[getValidGoogleTokenService] Erro ao validar data de expiração para userId: ${userId}:`, dateError);
      // Continua para renovar o token
    }
  }

  // 3. Se expirou ou não existe, renovamos manualmente
  try {
    console.log(`[getValidGoogleTokenService] Renovando token para userId: ${userId}...`);
    const startTime = Date.now();
    
    // 🎯 Timeout de 10 segundos para a chamada ao Google
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[getValidGoogleTokenService] ⚠️ Timeout na chamada ao Google (10s) para userId: ${userId}`);
    }, 10000);
    
    let response: Response;
    try {
      response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: profile.google_refresh_token,
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Erro de conexão com o servidor do Google (timeout).');
      }
      throw fetchErr;
    }
    
    const fetchDuration = Date.now() - startTime;
    console.log(`[getValidGoogleTokenService] Resposta do Google recebida em ${fetchDuration}ms:`, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

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
        console.log(`[google.service] Refresh token inválido removido do banco e status atualizado para userId: ${userId}. Usuário precisa fazer login novamente para obter novo refresh token.`);
      } catch (dbError) {
        console.error('[google.service] Erro ao limpar token do banco:', dbError);
      }

      // Retorna null - sem refresh token, não podemos gerar novos access tokens
      // O Google Picker precisa de access token OAuth válido, então o usuário precisa reautenticar
      console.log(`[getValidGoogleTokenService] Token inválido para userId: ${userId}. Usuário precisa fazer login novamente para usar Google Picker.`);
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
      google_token_expires_at: new Date(
        Date.now() + expiresInSeconds * 1000,
      ).toISOString(),
      google_auth_status: 'active', // Marca como ativo após renovação bem-sucedida
    };

    // Importante: Se o Google rotacionar o refresh_token, salvamos também
    if (data.refresh_token) {
      updates.google_refresh_token = data.refresh_token;
      console.log(`[getValidGoogleTokenService] Google rotacionou o refresh_token para userId: ${userId}`);
    }

    const { error: updateError } = await supabase
      .from('tb_profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error(`[getValidGoogleTokenService] Erro ao salvar token renovado para userId: ${userId}:`, updateError);
      // Ainda retorna o token mesmo se falhar ao salvar (pode ser usado imediatamente)
    } else {
      console.log(`[getValidGoogleTokenService] Token renovado e salvo com sucesso para userId: ${userId}`);
    }

    return data.access_token;
  } catch (fetchError: any) {
    // 🎯 Re-lança erros de renovação explícitos
    if (fetchError instanceof Error && fetchError.message === 'Falha ao renovar o acesso com o Google.') {
      throw fetchError;
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
        fetchError.message.includes('Falha de Rede') ||
        !fetchError.message.includes('Falha ao renovar');
      
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
