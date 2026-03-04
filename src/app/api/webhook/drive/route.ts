import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { revalidateDrivePhotos } from '@/actions/revalidate.actions';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { syncGaleriaPhotoCountByGaleriaId } from '@/core/services/galeria.service';

export async function POST(req: NextRequest) {
  const resourceState = req.headers.get('x-goog-resource-state');
  const channelId = req.headers.get('x-goog-channel-id');

  if (!channelId || resourceState === 'sync') {
    return NextResponse.json({ ok: true });
  }

  if (!['add', 'remove', 'update', 'change'].includes(resourceState ?? '')) {
    return NextResponse.json({ ok: true });
  }

  // Responde 200 imediatamente e processa em background
  waitUntil(processWebhook(channelId));

  return NextResponse.json({ ok: true });
}

async function processWebhook(channelId: string) {
  try {
    const supabase = createSupabaseAdmin();

    const { data: channel } = await supabase
      .from('tb_drive_watch_channels')
      .select('folder_id, galeria_id')
      .eq('channel_id', channelId)
      .maybeSingle();

    let folderId: string;
    let galeriaId: string;

    if (channel) {
      folderId = channel.folder_id;
      galeriaId = channel.galeria_id;
    } else {
      // Fallback pelo folderId embutido no channelId
      const parts = channelId.split('-');
      folderId = parts.slice(6, -1).join('-');

      if (!folderId) {
        console.warn(
          '[webhook/drive] Não foi possível extrair folderId:',
          channelId,
        );
        return;
      }

      const { data: channelByFolder } = await supabase
        .from('tb_drive_watch_channels')
        .select('folder_id, galeria_id')
        .eq('folder_id', folderId)
        .maybeSingle();

      if (!channelByFolder) {
        console.warn('[webhook/drive] channelId não encontrado:', channelId);
        return;
      }

      folderId = channelByFolder.folder_id;
      galeriaId = channelByFolder.galeria_id;
    }

    await syncGaleriaPhotoCountByGaleriaId(galeriaId);
    await revalidateDrivePhotos(folderId, galeriaId);

    console.log('[webhook/drive] ✅ Sync completo para pasta:', folderId);
  } catch (err) {
    console.error('[webhook/drive] Erro:', err);
  }
}
