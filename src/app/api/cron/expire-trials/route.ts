import { performDowngradeToFree } from '@/core/services/asaas.service';
import { createClient } from '@supabase/supabase-js';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { logSystemEvent } from '@/core/utils/telemetry';
import { NextResponse } from 'next/server';
import { enforcePhotoQuotaByArchivingOldest } from '@/core/services/asaas/gallery/quota-enforcement';

// Força a rota a não ser cacheada (importante para CRON)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const startTime = Date.now();
  try {
    // 1. Validação de Segurança (Vercel Cron ou Manual com Secret)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('[Cron] Tentativa de acesso não autorizada.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cliente Admin do Supabase (Service Role)
    // Usamos o Service Role para garantir que temos permissão de update em qualquer perfil
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 3. Buscar perfis onde o Trial expirou
    // Regra: is_trial é true E a data de expiração é menor que AGORA
    const now = utcIsoFrom(nowFn());
    const { data: expiredProfiles, error: fetchError } = await supabaseAdmin
      .from('tb_profiles')
      .select('id, username')
      .eq('is_trial', true)
      .lt('plan_trial_expires', now);

    if (fetchError) {
      console.error('[Cron] Erro ao buscar trials expirados:', fetchError);
      throw fetchError;
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      await logSystemEvent({
        serviceName: 'cron/expire-trials',
        status: 'success',
        executionTimeMs: Date.now() - startTime,
        payload: {
          processedCount: 0,
          message: 'Nenhum trial expirado encontrado para processamento.',
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Nenhum trial expirado encontrado para processamento.',
        timestamp: now,
      });
    }

    console.log(
      `[Cron] Iniciando downgrade de ${expiredProfiles.length} usuários.`,
    );

    // 4. Processar cada Downgrade individualmente
    // Usamos for...of para evitar sobrecarga simultânea no banco/revalidação
    const results = [];
    for (const profile of expiredProfiles) {
      console.log(
        `[Cron] Processando expiração: ${profile.username} (${profile.id})`,
      );

      // Garante exibição do alerta na próxima entrada do usuário.
      // No fluxo atual, o modal aparece quando last_downgrade_alert_viewed === false.
      const { data: profileMetaRow } = await supabaseAdmin
        .from('tb_profiles')
        .select('metadata')
        .eq('id', profile.id)
        .maybeSingle();

      const currentMetadata =
        (profileMetaRow?.metadata as Record<string, unknown>) || {};
      await supabaseAdmin
        .from('tb_profiles')
        .update({
          metadata: {
            ...currentMetadata,
            last_downgrade_alert_viewed: false,
            downgrade_reason:
              'Expiração automática de período de teste (Trial)',
            downgrade_at: utcIsoFrom(nowFn()),
          },
          updated_at: utcIsoFrom(nowFn()),
        })
        .eq('id', profile.id);

      const res = await performDowngradeToFree(
        profile.id,
        null, // Não há uma requisição de upgrade específica, é expiração automática
        'Expiração automática de período de teste (Trial)',
        supabaseAdmin, // Passamos o cliente admin para o service
      );

      let extraArchived = 0;
      let remainingTotal = 0;
      if (res.success) {
        const enforce = await enforcePhotoQuotaByArchivingOldest(
          supabaseAdmin,
          profile.id,
          'FREE',
        );
        extraArchived = enforce.archivedCount;
        remainingTotal = enforce.remainingTotal;
      }

      results.push({
        username: profile.username,
        success: res.success,
        archivedGalleries: res.excess_galleries.length,
        extraArchivedByTotalQuota: extraArchived,
        remainingTotalAfterArchive: remainingTotal,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    await logSystemEvent({
      serviceName: 'cron/expire-trials',
      status: failCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'error',
      executionTimeMs: Date.now() - startTime,
      payload: {
        processedCount: expiredProfiles.length,
        successCount,
        failCount,
        details: results,
      },
      errorMessage:
        failCount > 0
          ? `${failCount} falha(s) em ${expiredProfiles.length} processamento(s)`
          : undefined,
    });

    return NextResponse.json({
      success: true,
      processedCount: expiredProfiles.length,
      details: results,
      timestamp: utcIsoFrom(nowFn()),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[Cron] Erro crítico na rota de expiração:', error);
    await logSystemEvent({
      serviceName: 'cron/expire-trials',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      errorMessage: err.message,
      payload: { stack: err.stack },
    });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
