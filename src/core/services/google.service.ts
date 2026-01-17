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

export async function getValidGoogleTokenService(userId: string) {
  const supabase = await createSupabaseServerClient();

  // 1. Busca os tokens e a validade no banco
  const { data: profile, error } = await supabase
    .from('tb_profiles')
    .select(
      'google_refresh_token, google_access_token, google_token_expires_at',
    )
    .eq('id', userId)
    .single();

  if (error || !profile?.google_refresh_token) {
    throw new Error('Nenhum token do Google encontrado.');
  }

  // 2. VERIFICAÇÃO DE CACHE: O token no banco ainda é válido?
  // Adicionamos uma margem de segurança de 5 minutos (300.000 ms)
  if (profile.google_access_token && profile.google_token_expires_at) {
    const expiresAt = new Date(profile.google_token_expires_at).getTime();
    const now = Date.now();

    if (expiresAt > now + 60000) {
      return profile.google_access_token;
    }
  }

  // 3. Se expirou ou não existe, renovamos manualmente
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (
      data.error === 'invalid_grant' ||
      data.error === 'refresh_token_already_used'
    ) {
      // Se o token já foi usado, a sessão é inválida.
      // O ideal aqui é redirecionar para o login para resetar os cookies.
      return redirect('/login?error=session_expired');
    }

    if (!data.access_token) {
      throw new Error('Falha ao renovar o acesso com o Google.');
    }

    // 4. PERSISTÊNCIA: Salva os novos dados para a próxima chamada
    const updates: any = {
      google_access_token: data.access_token,
      // Google retorna 'expires_in' em segundos (geralmente 3600)
      google_token_expires_at: new Date(
        Date.now() + data.expires_in * 1000,
      ).toISOString(),
    };

    // Importante: Se o Google rotacionar o refresh_token, salvamos também
    if (data.refresh_token) {
      updates.google_refresh_token = data.refresh_token;
    }

    await supabase.from('tb_profiles').update(updates).eq('id', userId);

    return data.access_token;
  } catch (fetchError: any) {
    //Se o erro for um dos que nós lançamos manualmente, repasse ele adiante
    const knownErrors = [
      'AUTH_RECONNECT_REQUIRED',
      'Falha ao renovar o acesso com o Google.',
    ];
    if (knownErrors.includes(fetchError.message)) {
      throw fetchError;
    }

    // Erros de REDE reais (fetch falhou, DNS, timeout) caem aqui
    throw new Error('Erro de conexão com o servidor do Google.');
  }
}
