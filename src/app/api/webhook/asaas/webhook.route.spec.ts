// src/app/api/webhook/asaas/route.spec.ts
/**
 * Suite de testes de integração do webhook Asaas.
 *
 * Estratégia:
 *  - Importar o handler POST diretamente (sem servidor HTTP)
 *  - Construir NextRequest manualmente com header asaas-access-token
 *  - Mockar Supabase, performDowngradeToFree e revalidatePath
 *
 * Cobertura:
 *  A. Autenticação — token ausente, errado, correto
 *  B. PAYMENT_CONFIRMED / PAYMENT_RECEIVED — validação de valor + ativação RPC
 *  C. PAYMENT_OVERDUE
 *  D. PAYMENT_REFUNDED — downgrade + fallback sem request
 *  E. SUBSCRIPTION_CANCELED — pending → downgrade; já cancelled → no-op
 *  F. Eventos ignorados — HTTP 200 sem ação
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}));
vi.mock('@/core/services/asaas.service', () => ({
  performDowngradeToFree: vi.fn().mockResolvedValue({
    success: true,
    needs_adjustment: false,
    excess_galleries: [],
  }),
}));
vi.mock('@/core/services/asaas', () => ({
  reactivateAutoArchivedGalleries: vi
    .fn()
    .mockResolvedValue({ reactivated: 0 }),
}));

import { revalidatePath } from 'next/cache';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import { reactivateAutoArchivedGalleries } from '@/core/services/asaas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_TOKEN = 'webhook-secret-test';

function makeRequest(body: object, token?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhook/asaas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token !== undefined ? { 'asaas-access-token': token } : {}),
    },
    body: JSON.stringify(body),
  });
}

const makeSelect = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi
    .fn()
    .mockImplementation((r: (v: unknown) => void) => r({ data, error })),
});

const makeUpdate = (error: unknown = null) => {
  const resolved = { data: null, error };
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then(onFulfilled?: (v: unknown) => void) {
      return Promise.resolve(resolved).then(onFulfilled);
    },
  };
  return chain;
};

const makeRpc = (error: unknown = null) => ({
  rpc: vi.fn().mockResolvedValue({ data: null, error }),
});

// ─── Importação lazy ─────────────────────────────────────────────────────────

const { POST } = await import('./route');

// ═══════════════════════════════════════════════════════════════════════════════
// A. Autenticação
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — Autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  it('token ausente → 401', async () => {
    const res = await POST(makeRequest({ event: 'PAYMENT_CONFIRMED' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('token errado → 401', async () => {
    const res = await POST(
      makeRequest({ event: 'PAYMENT_CONFIRMED' }, 'wrong-token'),
    );
    expect(res.status).toBe(401);
  });

  it('token correto + evento nulo → 200 sem ação', async () => {
    const res = await POST(makeRequest({ event: null }, WEBHOOK_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it('ASAAS_WEBHOOK_TOKEN não configurado → 401 sempre', async () => {
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', '');
    const res = await POST(
      makeRequest({ event: 'PAYMENT_CONFIRMED' }, WEBHOOK_TOKEN),
    );
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. PAYMENT_CONFIRMED / PAYMENT_RECEIVED
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — PAYMENT_CONFIRMED e PAYMENT_RECEIVED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  function makeSupabaseWithPayment(amountFinal: number) {
    const rpcMock = makeRpc();
    const selectReq = makeSelect({ id: 'req-1', amount_final: amountFinal });
    const selectProfileReq = makeSelect({
      profile_id: 'profile-abc',
      plan_key_requested: 'PRO',
    });
    const updateMock = makeUpdate();
    const selectGalerias = makeSelect([]);
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectReq) // check existing payment
        .mockReturnValueOnce(selectReq) // validatePaymentAmount: select tb_upgrade_requests
        .mockReturnValueOnce(selectProfileReq) // reactivate: select profile_id, plan_key_requested
        .mockReturnValueOnce(selectGalerias), // revalidateUserCache
      rpc: rpcMock.rpc,
    };
    return supabase;
  }

  it('PAYMENT_CONFIRMED com valor correto → RPC chamada, reactivateAutoArchivedGalleries, revalidatePath', async () => {
    const supabase = makeSupabaseWithPayment(79);
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay-1',
            value: 79.0,
            status: 'CONFIRMED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('activate_plan_from_payment', {
      p_asaas_payment_id: 'pay-1',
      p_asaas_status: 'CONFIRMED',
    });
    expect(reactivateAutoArchivedGalleries).toHaveBeenCalledWith(
      'profile-abc',
      'PRO',
      supabase,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('PAYMENT_CONFIRMED com tolerância ≤ R$0.01 → aceito', async () => {
    const supabase = makeSupabaseWithPayment(79);
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay-1',
            value: 79.005,
            status: 'CONFIRMED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalled();
  });

  it('PAYMENT_CONFIRMED com valor divergente → status=rejected, RPC NÃO chamada', async () => {
    const selectReq = makeSelect({ id: 'req-1', amount_final: 79 });
    const updateRejected = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectReq) // check existing payment
        .mockReturnValueOnce(selectReq) // validatePaymentAmount
        .mockReturnValueOnce(updateRejected),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay-1',
            value: 50.0,
            status: 'CONFIRMED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200); // Asaas não deve tentar novamente
    expect(supabase.rpc).not.toHaveBeenCalled();
    // update deve ter sido chamado com status=rejected
    expect(updateRejected.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    );
  });

  it('PAYMENT_RECEIVED (idempotente) → RPC chamada normalmente', async () => {
    const supabase = makeSupabaseWithPayment(79);
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_RECEIVED',
          payment: {
            id: 'pay-1',
            value: 79,
            status: 'RECEIVED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('activate_plan_from_payment', {
      p_asaas_payment_id: 'pay-1',
      p_asaas_status: 'CONFIRMED',
    });
  });

  it('payment sem request no banco → valid=true (fallback: permite)', async () => {
    const selectNone = makeSelect(null); // maybeSingle retorna null (validatePaymentAmount)
    const selectProfileNone = makeSelect(null); // reactivate: sem request → null
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectNone) // check existing payment
        .mockReturnValueOnce(selectNone) // validatePaymentAmount
        .mockReturnValueOnce(selectProfileNone),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay-orphan',
            value: 999,
            status: 'CONFIRMED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalled();
    expect(reactivateAutoArchivedGalleries).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. PAYMENT_OVERDUE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — PAYMENT_OVERDUE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  it('PAYMENT_OVERDUE → RPC com status OVERDUE', async () => {
    const supabase = {
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_OVERDUE',
          payment: {
            id: 'pay-1',
            value: 79,
            status: 'OVERDUE',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('activate_plan_from_payment', {
      p_asaas_payment_id: 'pay-1',
      p_asaas_status: 'OVERDUE',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. PAYMENT_REFUNDED
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — PAYMENT_REFUNDED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  it('PAYMENT_REFUNDED com request vinculado → performDowngradeToFree chamado', async () => {
    const reqData = { id: 'req-1', profile_id: 'profile-abc' };
    const selectMock = makeSelect(reqData);
    const selectGalerias = makeSelect([]);
    const supabase = {
      from: vi.fn().mockReturnValueOnce(selectMock).mockReturnValueOnce(selectGalerias),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_REFUNDED',
          payment: {
            id: 'pay-refunded',
            value: 79,
            status: 'REFUNDED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(performDowngradeToFree).toHaveBeenCalledWith(
      'profile-abc',
      'req-1',
      expect.stringContaining('PAYMENT_REFUNDED'),
      supabase,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    // RPC não deve ter sido chamado (fluxo alternativo)
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('PAYMENT_REFUNDED sem request vinculado → RPC fallback, sem crash', async () => {
    const selectNone = makeSelect(null);
    const supabase = {
      from: vi.fn().mockReturnValueOnce(selectNone),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_REFUNDED',
          payment: {
            id: 'pay-orphan',
            value: 79,
            status: 'REFUNDED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(performDowngradeToFree).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. SUBSCRIPTION_CANCELED
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — SUBSCRIPTION_CANCELED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  it('pending_cancellation → performDowngradeToFree + revalidatePath', async () => {
    const reqData = {
      id: 'req-1',
      profile_id: 'profile-abc',
      status: 'pending_cancellation',
    };
    const selectGalerias = makeSelect([]);
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelect(reqData)).mockReturnValueOnce(selectGalerias),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'SUBSCRIPTION_CANCELED',
          payment: null,
          subscription: { id: 'sub-abc' },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(performDowngradeToFree).toHaveBeenCalledWith(
      'profile-abc',
      'req-1',
      expect.stringContaining('SUBSCRIPTION_CANCELED'),
      supabase,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('já cancelled → UPDATE no-op (neq cancelled), sem downgrade', async () => {
    const reqData = {
      id: 'req-2',
      profile_id: 'profile-def',
      status: 'cancelled',
    };
    const updateMock = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelect(reqData))
        .mockReturnValueOnce(updateMock),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'SUBSCRIPTION_CANCELED',
          payment: null,
          subscription: { id: 'sub-def' },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(performDowngradeToFree).not.toHaveBeenCalled();
    // update deve ter sido chamado com neq('status', 'cancelled')
    expect(updateMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
    expect(updateMock.neq).toHaveBeenCalledWith('status', 'cancelled');
  });

  it('subscription_id não encontrado → 200 sem ação', async () => {
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelect(null)),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'SUBSCRIPTION_CANCELED',
          payment: null,
          subscription: { id: 'sub-unknown' },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
    expect(performDowngradeToFree).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. Eventos ignorados
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — Eventos ignorados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  const ignoredEvents = [
    'PAYMENT_CREATED',
    'PAYMENT_AWAITING_RISK_ANALYSIS',
    'SUBSCRIPTION_CREATED',
    'PAYMENT_DELETED',
    'PAYMENT_RESTORED',
    'TOTALLY_UNKNOWN_EVENT',
  ];

  ignoredEvents.forEach((event) => {
    it(`${event} → HTTP 200 sem queries ao banco`, async () => {
      const supabase = { from: vi.fn(), rpc: vi.fn() };
      vi.mocked(
        await import('@/lib/supabase.server'),
      ).createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);

      const res = await POST(
        makeRequest(
          {
            event,
            payment: {
              id: 'pay-1',
              value: 0,
              status: 'PENDING',
              subscription: null,
            },
          },
          WEBHOOK_TOKEN,
        ),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. Resiliência — erro interno → 200 (Asaas não reenviar)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Webhook — Resiliência a erros internos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', WEBHOOK_TOKEN);
  });

  it('erro no createSupabaseServerClient → HTTP 200 (nunca 500)', async () => {
    vi.mocked(
      await import('@/lib/supabase.server'),
    ).createSupabaseServerClient = vi
      .fn()
      .mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay-1',
            value: 79,
            status: 'CONFIRMED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    // O webhook SEMPRE retorna 200 para o Asaas não reenviar
    expect(res.status).toBe(200);
  });

  it('performDowngradeToFree lança exceção → HTTP 200 (catch externo)', async () => {
    vi.mocked(performDowngradeToFree).mockRejectedValueOnce(
      new Error('Unexpected DB error'),
    );
    const reqData = { id: 'req-1', profile_id: 'profile-abc' };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelect(reqData)),
      rpc: vi.fn(),
    };
    const mod = vi.mocked(await import('@/lib/supabase.server'));
    mod.createSupabaseServerClient = vi.fn().mockResolvedValue(supabase);
    mod.createSupabaseAdmin = vi.fn().mockReturnValue(supabase);

    const res = await POST(
      makeRequest(
        {
          event: 'PAYMENT_REFUNDED',
          payment: {
            id: 'pay-refunded',
            value: 79,
            status: 'REFUNDED',
            subscription: null,
          },
        },
        WEBHOOK_TOKEN,
      ),
    );

    expect(res.status).toBe(200);
  });
});
