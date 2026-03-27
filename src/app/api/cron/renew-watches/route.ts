import { NextResponse } from 'next/server';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { logSystemEvent } from '@/core/utils/telemetry';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { registerFolderWatch } from '@/core/services/drive-watch.service';

export async function GET(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdmin();
    const in24h = nowFn().getTime() + 24 * 60 * 60 * 1000;

    const { data: expiring } = await supabase
      .from('tb_drive_watch_channels')
      .select('*, tb_profiles!inner(google_refresh_token)')
      .lt('expiration', in24h);

    if (!expiring?.length) {
      await logSystemEvent({
        serviceName: 'cron/renew-watches',
        status: 'success',
        executionTimeMs: Date.now() - startTime,
        payload: { renewed: 0, scanned: 0, failed: 0 },
      });
      return NextResponse.json({ renewed: 0 });
    }

    let renewed = 0;
    let failed = 0;
    const channelErrors: string[] = [];
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
        failed++;
        console.error(
          '[renew-watches] Erro para channel:',
          channel.channel_id,
          err,
        );
        channelErrors.push(
          `${String(channel.channel_id ?? channel.id)}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const status =
      failed === 0 ? 'success' : renewed > 0 ? 'partial' : 'error';

    await logSystemEvent({
      serviceName: 'cron/renew-watches',
      status,
      executionTimeMs: Date.now() - startTime,
      payload: {
        renewed,
        failed,
        scanned: expiring.length,
        channelErrors: channelErrors.length ? channelErrors : undefined,
      },
      errorMessage:
        status === 'error'
          ? channelErrors.join(' | ') || 'Nenhum watch renovado'
          : undefined,
    });

    return NextResponse.json({ renewed });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logSystemEvent({
      serviceName: 'cron/renew-watches',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      errorMessage: err.message,
      payload: { stack: err.stack },
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
