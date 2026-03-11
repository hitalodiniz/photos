// src/app/api/dashboard/cancel-subscription/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleSubscriptionCancellation } from '@/core/services/asaas.service';
import type { CancelReason } from '@/components/AssinaturaContent/CancelSubscriptionModal';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let reason: CancelReason | null = null;
  let comment = '';
  try {
    const body = await req.json();
    reason = body.reason ?? null;
    comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  } catch {
    // body ausente ou inválido — retrocompat (chamadas sem body continuam funcionando)
  }

  try {
    const result = await handleSubscriptionCancellation({ reason, comment });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Usuário não autenticado.' ? 401 : 400 },
      );
    }
    revalidatePath('/dashboard/assinatura');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cancel-subscription]', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar assinatura.' },
      { status: 500 },
    );
  }
}
