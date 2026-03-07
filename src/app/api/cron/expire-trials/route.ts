// src/app/api/cron/expire-trials/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // ✅ Vercel Cron Jobs usa header especial de autenticação
  const authHeader = request.headers.get('authorization');

  // Vercel envia automaticamente este header em cron jobs
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Service Role Key (admin)
  );

  try {
    // Executar função do Postgres
    const { error } = await supabase.rpc('expire_trials');

    if (error) {
      console.error('❌ Error expiring trials:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Trials expired successfully');
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ✅ Permitir execução via GET (Vercel Cron usa GET)
export const dynamic = 'force-dynamic';

// Exemplo de uso:
//curl -X GET https://seusite.com/api/cron/expire-trials \
//  -H "Authorization: Bearer seu_token_secreto_aqui"
