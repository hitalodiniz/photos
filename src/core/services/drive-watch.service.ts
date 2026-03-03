// src/core/services/drive-watch.service.ts
//
// Ciclo do webhook Google Drive:
// 1. createGaleria/updateGaleria → registerFolderWatch() → POST Drive API + upsert tb_drive_watch_channels
// 2. Google envia POST /api/webhook/drive → processWebhook busca folder_id por channel_id → revalida cache
// 3. Cron GET /api/cron/renew-watches → lê canais com expiration < 24h → registerFolderWatch() para cada um
//
// Tabela necessária (criar no Supabase se não existir):
// create table tb_drive_watch_channels (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid not null references tb_profiles(id) on delete cascade,
//   galeria_id uuid not null references tb_galerias(id) on delete cascade,
//   folder_id text not null,
//   channel_id text not null,
//   resource_id text not null,
//   expiration bigint not null,
//   created_at timestamptz default now(),
//   updated_at timestamptz default now(),
//   unique(folder_id, user_id)
// );
// (RLS pode bloquear anon; cron e webhook usam createSupabaseAdmin.)
//
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseAdmin } from '@/lib/supabase.server';

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/drive`;

/**
 * 📡 Registra watch no Google Drive para uma pasta
 * Notificações serão enviadas para o webhook quando houver mudanças.
 * Persiste o canal em tb_drive_watch_channels para o cron de renovação e o webhook.
 *
 * @param accessToken - Google access token válido
 * @param folderId - ID da pasta do Google Drive
 * @param galeriaId - ID da galeria no banco
 * @param userId - ID do usuário
 */
export async function registerFolderWatch(
  accessToken: string,
  folderId: string,
  galeriaId: string,
  userId: string,
) {
  // ✅ Pula em desenvolvimento — Google não aceita localhost
  if (
    !process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NODE_ENV === 'development'
  ) {
    console.log(
      '[registerFolderWatch] Pulando em desenvolvimento (sem HTTPS público)',
    );
    return null;
  }
  console.log('[registerFolderWatch] Registrando watch...');

  // Cliente admin: leitura e escrita sem depender de RLS (cron não tem sessão de usuário)
  const supabaseAdmin = createSupabaseAdmin();

  // 1️⃣ Para watch anterior dessa pasta, se existir
  const { data: existing } = await supabaseAdmin
    .from('tb_drive_watch_channels')
    .select('channel_id, resource_id')
    .eq('folder_id', folderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    console.log('[registerFolderWatch] Parando watch anterior...');
    await stopFolderWatch(
      accessToken,
      existing.channel_id,
      existing.resource_id,
    ).catch((err) => {
      console.warn('[registerFolderWatch] Erro ao parar watch anterior:', err);
    });
  }

  // 2️⃣ Cria novo watch na API do Google
  const channelId = `gallery-${userId}-${folderId}-${Date.now()}`;
  const expirationMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 dias (ms)

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/watch`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: WEBHOOK_URL,
        expiration: expirationMs,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    console.error(
      '[registerFolderWatch] Erro ao registrar na API Google:',
      err,
    );
    throw new Error(err.error?.message || 'Falha ao registrar watch');
  }

  const data = await res.json();

  // 3️⃣ Persiste no banco (obrigatório para renew-watches e webhook)
  const row = {
    user_id: userId,
    galeria_id: galeriaId,
    folder_id: folderId,
    channel_id: channelId,
    resource_id: data.resourceId ?? '',
    expiration: expirationMs,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabaseAdmin
    .from('tb_drive_watch_channels')
    .upsert(row, { onConflict: 'folder_id,user_id' });

  if (upsertError) {
    console.error(
      '[registerFolderWatch] Erro ao gravar no banco:',
      upsertError.message,
      upsertError.details,
    );
    throw new Error(
      `Watch registrado no Google mas falha ao gravar no banco: ${upsertError.message}`,
    );
  }

  console.log('[registerFolderWatch] ✅ Watch registrado e persistido:', {
    channelId,
    folderId,
    galeriaId,
  });

  return data;
}

/**
 * 🛑 Para um watch ativo do Google Drive
 *
 * @param accessToken - Google access token válido
 * @param channelId - ID do canal criado
 * @param resourceId - ID do recurso retornado pelo Google
 */
export async function stopFolderWatch(
  accessToken: string,
  channelId: string,
  resourceId: string,
) {
  try {
    await fetch('https://www.googleapis.com/drive/v3/channels/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        resourceId,
      }),
    });

    console.log('[stopFolderWatch] ✅ Watch parado:', channelId);
  } catch (error) {
    console.error('[stopFolderWatch] Erro:', error);
    throw error;
  }
}

/**
 * 🔄 Renova um watch que está próximo de expirar
 * Deve ser chamado por um cron job diariamente.
 * Usa cliente admin para ler a tabela (cron não tem sessão de usuário).
 */
export async function renewExpiringWatches() {
  const supabase = createSupabaseAdmin();
  const now = Date.now();
  const threshold = now + 24 * 60 * 60 * 1000; // Renova se expira em < 24h

  // Busca watches próximos de expirar
  const { data: expiring } = await supabase
    .from('tb_drive_watch_channels')
    .select('*, tb_profiles!inner(google_refresh_token)')
    .lt('expiration', threshold)
    .order('expiration', { ascending: true });

  if (!expiring || expiring.length === 0) {
    console.log('[renewExpiringWatches] Nenhum watch para renovar');
    return { renewed: 0, failed: 0 };
  }

  console.log(`[renewExpiringWatches] Renovando ${expiring.length} watches...`);

  let renewed = 0;
  let failed = 0;

  for (const watch of expiring) {
    try {
      // Obter access token do refresh token

      const accessToken = await getDriveAccessTokenForUser(watch.user_id);

      if (!accessToken) {
        console.error(
          `[renewExpiringWatches] Token inválido para userId: ${watch.user_id}`,
        );
        failed++;
        continue;
      }

      // Registra novo watch (que automaticamente para o anterior)
      await registerFolderWatch(
        accessToken,
        watch.folder_id,
        watch.galeria_id,
        watch.user_id,
      );

      renewed++;
    } catch (error) {
      console.error(
        `[renewExpiringWatches] Erro ao renovar watch ${watch.channel_id}:`,
        error,
      );
      failed++;
    }
  }

  console.log(
    `[renewExpiringWatches] ✅ Renovados: ${renewed}, Falhas: ${failed}`,
  );
  return { renewed, failed };
}
