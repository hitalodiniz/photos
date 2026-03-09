// src/app/api/dashboard/cancel-subscription/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleSubscriptionCancellation } from '@/core/services/asaas.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/cancel-subscription
 * Cancela a assinatura do usuário autenticado (≤7d: refund + downgrade; >7d: agendado).
 * Usado pelo front (ex.: botão "Cancelar assinatura") e por testes de integração.
 */
export async function POST() {
  try {
    const result = await handleSubscriptionCancellation();
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
