import { performDowngradeToFree } from '@/core/services/asaas.service';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Força a rota a não ser cacheada (importante para CRON)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    const now = new Date().toISOString();
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

      const res = await performDowngradeToFree(
        profile.id,
        null, // Não há uma requisição de upgrade específica, é expiração automática
        'Expiração automática de período de teste (Trial)',
        supabaseAdmin, // Passamos o cliente admin para o service
      );

      results.push({
        username: profile.username,
        success: res.success,
        archivedGalleries: res.excess_galleries.length,
      });
    }

    // 5. Retorno de sucesso
    return NextResponse.json({
      success: true,
      processedCount: expiredProfiles.length,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Erro crítico na rota de expiração:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
