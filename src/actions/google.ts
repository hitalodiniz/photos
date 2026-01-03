// src/actions/google.ts (Adicionar esta função)
'use server';

import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseServerClient } from '@/lib/supabase.server';
/**
 * Busca o ID da pasta-mãe (parent) de um arquivo no Google Drive
 * @param fileId O ID do arquivo selecionado no Google Picker.
 * @param userId O ID do usuário logado (fotógrafo).
 * @returns O ID da pasta-mãe ou null se houver falha.
 */
export async function getParentFolderIdServer(
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
 * @param userId O ID do usuário logado (fotógrafo).
 * @returns O nome da pasta ou null em caso de falha.
 */
export async function getDriveFolderName(
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
export async function checkFolderPublicPermission(
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

export async function getValidGoogleToken(userId: string) {
  // 🎯 Use a sua função exportada (Opção 1 do seu arquivo)
  const supabase = await createSupabaseServerClient();

  // 1. Busca o refresh_token no seu perfil
  const { data: profile, error } = await supabase
    .from('tb_profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (error || !profile?.google_refresh_token) {
    console.error('Erro ao buscar perfil no Supabase:', error);
    throw new Error('Nenhum token do Google encontrado para este fotógrafo.');
  }

  // 2. Faz o Refresh manualmente com a API do Google
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET, // Garanta que esta variável existe no .env
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      console.error('Resposta inválida do Google OAuth:', data);
      throw new Error('Falha ao renovar o acesso com o Google.');
    }

    return data.access_token;
  } catch (fetchError) {
    console.error('Erro na requisição ao Google OAuth:', fetchError);
    throw new Error('Erro de conexão com o servidor do Google.');
  }
}
