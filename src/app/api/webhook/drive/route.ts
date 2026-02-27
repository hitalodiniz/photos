import { NextRequest, NextResponse } from 'next/server';
import { revalidateDrivePhotos } from '@/actions/revalidate.actions';
import { createSupabaseClientForCache } from '@/lib/supabase.server';

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
    const supabase = await createSupabaseClientForCache();

    // Busca qual pasta está associada a esse channelId
    const { data: channel } = await supabase
      .from('tb_drive_watch_channels')
      .select('folder_id, galeria_id')
      .eq('channel_id', channelId)
      .maybeSingle();

    if (!channel) {
      console.warn('[webhook/drive] channelId não encontrado:', channelId);
      return;
    }

    // Debounce: evita múltiplas revalidações para a mesma pasta em sequência
    const key = channel.folder_id;
    if (pendingReloads.has(key)) {
      clearTimeout(pendingReloads.get(key));
    }

    const timer = setTimeout(async () => {
      pendingReloads.delete(key);
      // Usa sua função já existente — ela invalida drive-{folderId} e photos-{galeriaId}
      await revalidateDrivePhotos(channel.folder_id, channel.galeria_id);
      console.log(
        '[webhook/drive] Cache invalidado para pasta:',
        channel.folder_id,
      );
    }, 2000);

    pendingReloads.set(key, timer);
  } catch (err) {
    console.error('[webhook/drive] Erro ao processar webhook:', err);
  }
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
