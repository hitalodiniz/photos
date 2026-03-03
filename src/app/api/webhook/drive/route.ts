import { NextRequest, NextResponse } from 'next/server';
import { revalidateDrivePhotos } from '@/actions/revalidate.actions';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import {
  getGaleriaByIdForServer,
  syncGaleriaPhotoCountByGaleriaId,
} from '@/core/services/galeria.service';

// Debounce em memória (sobrevive por enquanto o processo estiver vivo)
const pendingReloads = new Map<string, NodeJS.Timeout>();

export async function POST(req: NextRequest) {
  // 1. Responde imediatamente (Google exige resposta rápida)
  const resourceState = req.headers.get('x-goog-resource-state');
  const channelId = req.headers.get('x-goog-channel-id');

  // 'sync' é só a confirmação inicial do registro do watch — ignora
  if (!channelId || resourceState === 'sync') {
    return NextResponse.json({ ok: true });
  }

  // Só nos interessa quando o conteúdo muda
  if (!['add', 'remove', 'update', 'change'].includes(resourceState ?? '')) {
    return NextResponse.json({ ok: true });
  }

  // 2. Processa em background (não bloqueia a resposta)
  processWebhook(channelId).catch(console.error);

  return NextResponse.json({ ok: true });
}

async function processWebhook(channelId: string) {
  try {
    const supabase = createSupabaseAdmin();

    // Extrai o folderId diretamente do channelId
    // Formato: gallery-{userId}-{folderId}-{timestamp}
    const parts = channelId.split('-');
    // folderId é a parte do meio — tudo entre o userId (4 partes uuid) e o timestamp final
    // gallery + 4 partes uuid + folderId + timestamp
    const folderIdFromChannel = parts.slice(6, -1).join('-');

    // Busca pelo folder_id extraído (mais resiliente que buscar pelo channelId exato)
    const { data: channel } = await supabase
      .from('tb_drive_watch_channels')
      .select('folder_id, galeria_id')
      .eq('folder_id', folderIdFromChannel)
      .maybeSingle();

    if (!channel) {
      // Fallback: tenta pelo channelId exato (para casos onde o formato muda)
      const { data: channelById } = await supabase
        .from('tb_drive_watch_channels')
        .select('folder_id, galeria_id')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (!channelById) {
        console.warn('[webhook/drive] channelId não encontrado:', channelId);
        return;
      }

      return processRevalidation(channelById.folder_id, channelById.galeria_id);
    }

    processRevalidation(channel.folder_id, channel.galeria_id);
  } catch (err) {
    console.error('[webhook/drive] Erro ao processar webhook:', err);
  }
}

function processRevalidation(folderId: string, galeriaId: string) {
  const key = folderId;
  if (pendingReloads.has(key)) {
    clearTimeout(pendingReloads.get(key));
  }

  const timer = setTimeout(async () => {
    pendingReloads.delete(key);
    await revalidateDrivePhotos(folderId, galeriaId);

    const galeria = await getGaleriaByIdForServer(galeriaId);
    if (galeria) {
      await syncGaleriaPhotoCountByGaleriaId(galeriaId);
    }
    console.log('[webhook/drive] Cache invalidado para pasta:', folderId);
  }, 2000);

  pendingReloads.set(key, timer);
}

// ## Fluxo completo com seu código
// ```
// createGaleria()
//   → insert no banco
//   → revalidateGalleryCache()       ← já existia
//   → registerFolderWatch()          ← novo

// Usuário add/remove foto no Drive
//   → Google POST /api/webhook/drive
//   → busca folder_id pelo channelId na tb_drive_watch_channels
//   → debounce 2s
//   → revalidateDrivePhotos(folderId, galeriaId)  ← já existia
//   → invalida drive-{folderId} e photos-{galeriaId}
//   → Next.js rebusca na próxima requisição
