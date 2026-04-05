import { autoPurgeTrashAction } from '@/actions/galeria.actions';
import { logSystemEvent } from '@/core/utils/telemetry';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  try {
    const result = await autoPurgeTrashAction();

    await logSystemEvent({
      serviceName: 'cron/purge-trash',
      status: result.success ? 'success' : 'error',
      executionTimeMs: Date.now() - startTime,
      payload: result,
      errorMessage: result.success ? undefined : result.error,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logSystemEvent({
      serviceName: 'cron/purge-trash',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      errorMessage: err.message,
      payload: { stack: err.stack },
    });
    return NextResponse.json(
      { success: false, error: 'Falha na execução do cron.' },
      { status: 500 },
    );
  }
}
