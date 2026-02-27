import { createSupabaseServerClient } from '@/lib/supabase.server';

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/drive`;

export async function registerFolderWatch(
  accessToken: string,
  folderId: string,
  galeriaId: string,
  userId: string,
) {
  const supabase = await createSupabaseServerClient();

  // Para watch anterior dessa pasta, se existir
  const { data: existing } = await supabase
    .from('tb_drive_watch_channels')
    .select('channel_id, resource_id')
    .eq('folder_id', folderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await stopFolderWatch(
      accessToken,
      existing.channel_id,
      existing.resource_id,
    );
  }

  const channelId = `gallery-${userId}-${folderId}-${Date.now()}`;
  const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 dias

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
        expiration,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    console.error('[registerFolderWatch] Erro:', err);
    throw new Error(err.error?.message || 'Falha ao registrar watch');
  }

  const data = await res.json();

  // Salva no banco
  await supabase.from('tb_drive_watch_channels').upsert(
    {
      user_id: userId,
      galeria_id: galeriaId,
      folder_id: folderId,
      channel_id: channelId,
      resource_id: data.resourceId,
      expiration,
    },
    { onConflict: 'folder_id' }, // Atualiza se já existir
  );

  return data;
}

export async function stopFolderWatch(
  accessToken: string,
  channelId: string,
  resourceId: string,
) {
  await fetch('https://www.googleapis.com/drive/v3/channels/stop', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });
}
