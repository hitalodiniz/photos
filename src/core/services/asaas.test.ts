import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  getPixAdjustedTotal,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import {
  checkAndApplyExpiredSubscriptions,
  handleSubscriptionCancellation,
} from '@/core/services/asaas.service';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';

vi.mock('@/core/services/auth-context.service', () => ({
  getAuthenticatedUser: vi.fn(),
}));

// URL pública do túnel ngrok apontando para a sua app Next
const NGROK_BASE_URL =
  process.env.NGROK_WEBHOOK_URL ??
  'https://amparo-ungesticular-brynlee.ngrok-free.dev';

const WEBHOOK_URL = `${NGROK_BASE_URL.replace(/\/$/, '')}/api/webhook/asaas`;
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const integrationEnabled =
  !!WEBHOOK_TOKEN && !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

const describeIntegration = integrationEnabled ? describe : describe.skip;

/** Perfil usado nos cenários de downgrade, recuperação e arrependimento. Se não definido, esses testes são pulados. */
const INT_TEST_PROFILE_ID = process.env.ASAAS_INT_TEST_PROFILE_ID ?? null;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

describeIntegration('Asaas – Integração via Webhook (ngrok)', () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  });

  it('Cenário de Upgrade (Sucesso): PAYMENT_CONFIRMED atualiza plan_key e valores batem com plans.ts', async () => {
    // 1) Usa o último tb_upgrade_requests como cenário de teste
    const { data: req, error } = await admin
      .from('tb_upgrade_requests')
      .select(
        'id, profile_id, plan_key_requested, billing_period, billing_type, asaas_payment_id, amount_original, amount_discount, amount_final',
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(req).toBeTruthy();
    expect(req!.asaas_payment_id, 'asaas_payment_id ausente no upgrade').toBeTruthy();

    const paymentId = req!.asaas_payment_id as string;

    // 2) Dispara o webhook real via ngrok simulando PAYMENT_CONFIRMED
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN as string,
      },
      body: JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: paymentId,
          value: req!.amount_final,
          status: 'CONFIRMED',
          subscription: null,
        },
      }),
    });

    expect(res.status).toBe(200);

    // 3) Verifica se o plan_key do perfil foi atualizado para o plano solicitado
    const { data: profile, error: profileError } = await admin
      .from('tb_profiles')
      .select('plan_key')
      .eq('id', req!.profile_id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.plan_key).toBe(req!.plan_key_requested);

    // 4) Garante que amount_original, amount_discount e amount_final conferem com a tabela de planos
    const segment: SegmentType =
      (process.env.ASAAS_INT_SEGMENT as SegmentType) ?? 'PHOTOGRAPHER';
    const planKey = req!.plan_key_requested as PlanKey;
    const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];

    expect(planInfo, `Plano ${segment}/${planKey} não existe em PLANS_BY_SEGMENT`).toBeTruthy();

    const { effectiveMonthly, months } = getPeriodPrice(
      planInfo!,
      req!.billing_period as any,
    );

    const expectedOriginal = round2(effectiveMonthly * months);
    expect(round2(req!.amount_original)).toBe(expectedOriginal);

    if (req!.billing_type === 'PIX' && req!.billing_period !== 'monthly') {
      const pix = getPixAdjustedTotal(
        planInfo!,
        req!.billing_period as any,
      );
      const expectedDiscount = round2(pix.discountAmount);
      const expectedFinal = round2(pix.totalWithPixDiscount);

      expect(round2(req!.amount_discount)).toBe(expectedDiscount);
      expect(round2(req!.amount_final)).toBe(expectedFinal);
    } else {
      expect(round2(req!.amount_discount)).toBe(0);
      expect(round2(req!.amount_final)).toBe(expectedOriginal);
    }
  });

  // ─── Cenários que exigem ASAAS_INT_TEST_PROFILE_ID e dados preparados ───────

  it(
    INT_TEST_PROFILE_ID
      ? 'Cenário de Downgrade Automático (Expiração): pending_cancellation + checkAndApplyExpiredSubscriptions aplicam soft downgrade'
      : 'Cenário de Downgrade (skip: defina ASAAS_INT_TEST_PROFILE_ID)',
    async () => {
      if (!INT_TEST_PROFILE_ID) return;

      const profileId = INT_TEST_PROFILE_ID;

      // 1) Forçar um registro em pending_cancellation com período já expirado
      const { data: lastReq } = await admin
        .from('tb_upgrade_requests')
        .select('id')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastReq) {
        expect.fail(
          'Nenhum tb_upgrade_requests para o perfil de teste. Crie ao menos um upgrade (ex.: aprovado) para esse profile_id.',
        );
      }

      const eightMonthsAgo = new Date();
      eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

      await admin
        .from('tb_upgrade_requests')
        .update({
          status: 'pending_cancellation',
          processed_at: eightMonthsAgo.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lastReq.id);

      // Garantir perfil PRO e pelo menos 4 galerias (não deletadas, não arquivadas)
      await admin
        .from('tb_profiles')
        .update({ plan_key: 'PRO', updated_at: new Date().toISOString() })
        .eq('id', profileId);

      const { data: galleries } = await admin
        .from('tb_galerias')
        .select('id')
        .eq('user_id', profileId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (!galleries || galleries.length < 4) {
        expect.fail(
          `Perfil de teste precisa de pelo menos 4 galerias (is_deleted=false, is_archived=false). Encontradas: ${galleries?.length ?? 0}.`,
        );
      }

      // 2) Acionar a verificação de expiração (serviço com cliente admin)
      const result = await checkAndApplyExpiredSubscriptions(profileId, admin);

      expect(result.applied).toBe(true);

      // 3) Validar plan_key FREE e galerias excedentes com is_public=false e auto_archived=true
      const { data: profile } = await admin
        .from('tb_profiles')
        .select('plan_key')
        .eq('id', profileId)
        .single();
      expect(profile?.plan_key).toBe('FREE');

      const { data: afterGalleries } = await admin
        .from('tb_galerias')
        .select('id, is_public, auto_archived')
        .eq('user_id', profileId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      const freeLimit = 3;
      const excess = afterGalleries?.slice(freeLimit) ?? [];
      for (const g of excess) {
        expect(g.is_public).toBe(false);
        expect(g.auto_archived).toBe(true);
      }
    },
  );

  it(
    INT_TEST_PROFILE_ID
      ? 'Cenário de Recuperação: novo pagamento aprovado reexibe galerias auto_archived'
      : 'Cenário de Recuperação (skip: defina ASAAS_INT_TEST_PROFILE_ID)',
    async () => {
      if (!INT_TEST_PROFILE_ID) return;

      const profileId = INT_TEST_PROFILE_ID;

      // Partir de perfil com galerias auto_archived (ex.: após cenário de downgrade)
      const { data: archived } = await admin
        .from('tb_galerias')
        .select('id')
        .eq('user_id', profileId)
        .eq('auto_archived', true);

      if (!archived?.length) {
        expect.fail(
          'Para o teste de recuperação, o perfil precisa ter galerias com auto_archived=true (rode antes o cenário de Downgrade ou prepare dados manualmente).',
        );
      }

      const paymentId = `pay-recovery-${Date.now()}`;
      const amountFinal = 79;

      await admin.from('tb_upgrade_requests').insert({
        profile_id: profileId,
        plan_key_current: 'FREE',
        plan_key_requested: 'PRO',
        billing_type: 'PIX',
        billing_period: 'monthly',
        snapshot_name: 'Test',
        snapshot_cpf_cnpj: '00000000000',
        snapshot_email: 'test@test.com',
        snapshot_whatsapp: '11999999999',
        snapshot_address: 'Rua Test',
        amount_original: amountFinal,
        amount_discount: 0,
        amount_final: amountFinal,
        installments: 1,
        status: 'pending',
        asaas_payment_id: paymentId,
      });

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'asaas-access-token': WEBHOOK_TOKEN as string,
        },
        body: JSON.stringify({
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: paymentId,
            value: amountFinal,
            status: 'CONFIRMED',
            subscription: null,
          },
        }),
      });
      expect(res.status).toBe(200);

      const { data: afterGalleries } = await admin
        .from('tb_galerias')
        .select('id, is_public, auto_archived')
        .eq('user_id', profileId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      const reactivated = afterGalleries?.filter(
        (g) => g.auto_archived === false && g.is_public === true,
      );
      expect(reactivated?.length ?? 0).toBeGreaterThan(0);
    },
  );

  it(
    INT_TEST_PROFILE_ID
      ? 'Cenário de Arrependimento (≤ 7 dias): cancelamento dispara downgrade imediato (sem estorno via API)'
      : 'Cenário de Arrependimento (skip: defina ASAAS_INT_TEST_PROFILE_ID)',
    async () => {
      if (!INT_TEST_PROFILE_ID) return;

      const profileId = INT_TEST_PROFILE_ID;
      const paymentId = `pay-refund-test-${Date.now()}`;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await admin.from('tb_upgrade_requests').insert({
        profile_id: profileId,
        plan_key_current: 'FREE',
        plan_key_requested: 'PRO',
        billing_type: 'PIX',
        billing_period: 'monthly',
        snapshot_name: 'Test',
        snapshot_cpf_cnpj: '00000000000',
        snapshot_email: 'test@test.com',
        snapshot_whatsapp: '11999999999',
        snapshot_address: 'Rua Test',
        amount_original: 79,
        amount_discount: 0,
        amount_final: 79,
        installments: 1,
        status: 'approved',
        asaas_payment_id: paymentId,
        asaas_subscription_id: 'sub-test-cancel',
        processed_at: threeDaysAgo.toISOString(),
      });

      await admin
        .from('tb_profiles')
        .update({ plan_key: 'PRO', updated_at: new Date().toISOString() })
        .eq('id', profileId);

      let deleteSubscriptionCalled = false;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url?.includes('/subscriptions/') && (input as Request).method === 'DELETE') {
          deleteSubscriptionCalled = true;
          return Promise.resolve({ ok: true, status: 200 } as Response);
        }
        return originalFetch(input);
      }) as typeof fetch;

      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: profileId,
        profile: { plan_key: 'PRO' },
      } as never);

      try {
        const result = await handleSubscriptionCancellation(admin);
        expect(result.success).toBe(true);
        expect(result.type).toBe('refund_immediate');
        expect(deleteSubscriptionCalled).toBe(true);

        const { data: profile } = await admin
          .from('tb_profiles')
          .select('plan_key')
          .eq('id', profileId)
          .single();
        expect(profile?.plan_key).toBe('FREE');
      } finally {
        globalThis.fetch = originalFetch;
        vi.mocked(getAuthenticatedUser).mockClear();
      }
    },
  );
});