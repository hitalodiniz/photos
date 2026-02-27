import { NextResponse } from 'next/server';
import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { registerFolderWatch } from '@/core/services/drive-watch.service';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseClientForCache();
  const in24h = Date.now() + 24 * 60 * 60 * 1000;

  // Usa o mesmo refresh token da tb_profiles que as outras funcionalidades (Drive, etc.)
  const { data: expiring } = await supabase
    .from('tb_drive_watch_channels')
    .select('*, tb_profiles!inner(google_refresh_token)')
    .lt('expiration', in24h);

  if (!expiring?.length) {
    return NextResponse.json({ renewed: 0 });
  }

  let renewed = 0;
  for (const channel of expiring) {
    try {
      const refreshToken = channel.tb_profiles?.google_refresh_token;
      if (!refreshToken) continue;

      const accessToken = await getDriveAccessTokenForUser(channel.user_id);

      if (!accessToken) continue;

      await registerFolderWatch(
        accessToken,
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
