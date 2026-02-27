import { NextResponse } from 'next/server';
import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { registerFolderWatch } from '@/core/services/drive-watch.service';

export async function GET(req: Request) {
  // Protege a rota de cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseClientForCache();
  const in24h = Date.now() + 24 * 60 * 60 * 1000;

  const { data: expiring } = await supabase
    .from('tb_drive_watch_channels')
    .select('*, tb_profiles!user_id(id)')
    .lt('expiration', in24h);

  if (!expiring?.length) {
    return NextResponse.json({ renewed: 0 });
  }

  let renewed = 0;
  for (const channel of expiring) {
    try {
      // Busca o provider_token do usuário via auth.users
      const {
        data: { user },
      } = await supabase.auth.admin.getUserById(channel.user_id);
      const googleToken = user?.app_metadata?.provider_token;

      if (!googleToken) continue;

      await registerFolderWatch(
        googleToken,
        channel.folder_id,
        channel.galeria_id,
        channel.user_id,
      );
      renewed++;
    } catch (err) {
      console.error(
        '[renew-watches] Erro para channel:',
        channel.channel_id,
        err,
      );
    }
  }

  return NextResponse.json({ renewed });
}
