// src/core/services/asaas.service.spec.ts
/**
 * Suite de testes do ciclo de vida de assinaturas.
 *
 * Cenários cobertos:
 *  1. performDowngradeToFree – sucesso, idempotência, excedentes, falha de DB
 *  2. handleSubscriptionCancellation – arrependimento (≤7d), padrão (>7d),
 *     pending_cancellation já existente, sem assinatura, não autenticado
 *  3. checkAndApplyExpiredSubscriptions – período expirado, ainda vigente, sem registro
 *  4. Idempotência – webhook duplicado, usuário já FREE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';

vi.mock('@/core/services/auth-context.service', () => ({
  getAuthenticatedUser: vi.fn(),
}));

// ─── Helpers para mocks do Supabase ──────────────────────────────────────────

/** Builder encadeável de SELECT terminando em .single() */
const makeSelectSingle = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  // Suporte ao `await builder` direto (sem .single)
  then: vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data, error }),
    ),
});

/** Builder encadeável de SELECT terminando no await do builder (sem terminal) */
const makeSelectList = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  then: vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data, error }),
    ),
});

/** Builder de UPDATE encadeável (`.eq()` é o terminal) */
const makeUpdate = (error: unknown = null) => {
  const terminal = vi.fn().mockResolvedValue({ data: null, error });
  return {
    update: vi.fn().mockReturnThis(),
    eq: terminal,
    in: terminal,
    neq: terminal,
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error }),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    order: vi.fn().mockReturnThis(),
    then: vi
      .fn()
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error }),
      ),
  };
};

/** Builder de INSERT (o próprio `.insert()` resolve) */
const makeInsert = (error: unknown = null) => ({
  insert: vi.fn().mockResolvedValue({ data: null, error }),
  select: vi.fn().mockReturnThis(),
  then: vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error }),
    ),
});

// ─── Datas utilitárias ────────────────────────────────────────────────────────

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

// ─── Importação lazy (após mocks estarem prontos) ────────────────────────────

const {
  performDowngradeToFree,
  reactivateAutoArchivedGalleries,
  handleSubscriptionCancellation,
  checkAndApplyExpiredSubscriptions,
} = await import('./asaas.service');

// ═══════════════════════════════════════════════════════════════════════════════
describe('performDowngradeToFree', () => {
  const PROFILE_ID = 'profile-abc';
  const REQUEST_ID = 'req-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('✅ rebaixa PRO para FREE, registra histórico e oculta galerias excedentes', async () => {
    const galleries = [
      { id: 'g1', title: 'G1' },
      { id: 'g2', title: 'G2' },
      { id: 'g3', title: 'G3' },
      { id: 'g4', title: 'G4' }, // excedente (FREE limite = 3)
      { id: 'g5', title: 'G5' }, // excedente
    ];

    const profileSelectBuilder = makeSelectSingle({ plan_key: 'PRO' });
    const profileUpdateBuilder = makeUpdate();
    const historyInsertBuilder = makeInsert();
    const requestUpdateBuilder = makeUpdate();
    const galeriasSelectBuilder = makeSelectList(galleries);
    const galeriasUpdateBuilder = makeUpdate();

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(profileSelectBuilder) // 1. select plan_key
        .mockReturnValueOnce(profileUpdateBuilder) // 2. update FREE
        .mockReturnValueOnce(historyInsertBuilder) // 3. insert history
        .mockReturnValueOnce(requestUpdateBuilder) // 4. update request status
        .mockReturnValueOnce(galeriasSelectBuilder) // 5. select galleries
        .mockReturnValueOnce(galeriasUpdateBuilder), // 6. hide excess
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      PROFILE_ID,
      REQUEST_ID,
      'Teste',
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.needs_adjustment).toBe(true);
    expect(result.excess_galleries).toHaveLength(2);
    expect(result.excess_galleries.map((g) => g.id)).toEqual(['g4', 'g5']);

    // Verifica que plan_key foi atualizado para FREE
    expect(profileUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan_key: 'FREE' }),
    );

    // Verifica que histórico foi registrado
    expect(supabase.from).toHaveBeenCalledWith('tb_plan_history');
    expect(historyInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ old_plan: 'PRO', new_plan: 'FREE' }),
    );

    // Verifica que galerias excedentes foram ocultadas (soft downgrade: is_public + auto_archived)
    expect(galeriasUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_public: false,
        auto_archived: true,
      }),
    );
    expect(galeriasUpdateBuilder.in).toHaveBeenCalledWith('id', ['g4', 'g5']);
  });

  it('✅ idempotente: já está FREE → retorna sucesso sem queries de escrita', async () => {
    const profileSelectBuilder = makeSelectSingle({ plan_key: 'FREE' });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelectBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      PROFILE_ID,
      REQUEST_ID,
      'Já FREE',
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.needs_adjustment).toBe(false);
    // Apenas 1 chamada ao `from` (leitura do plan_key)
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('✅ não excede o limite: 3 galerias → needs_adjustment false', async () => {
    const galleries = [
      { id: 'g1', title: 'G1' },
      { id: 'g2', title: 'G2' },
      { id: 'g3', title: 'G3' },
    ];

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'START' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert())
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeSelectList(galleries)),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      PROFILE_ID,
      REQUEST_ID,
      'Teste',
      supabase,
    );

    expect(result.needs_adjustment).toBe(false);
    expect(result.excess_galleries).toHaveLength(0);
    // Não deve ter chamado update de galerias (sexta chamada não ocorre)
    expect(supabase.from).toHaveBeenCalledTimes(5);
  });

  it('❌ retorna erro quando o update de plan_key falha', async () => {
    const dbError = { message: 'DB error', code: '500' };
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' }))
        .mockReturnValueOnce(makeUpdate(dbError)),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      PROFILE_ID,
      REQUEST_ID,
      'Teste',
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('✅ pula update do upgrade request quando upgradeRequestId é null', async () => {
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PLUS' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert())
        // Sem chamada para tb_upgrade_requests
        .mockReturnValueOnce(makeSelectList([])),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      PROFILE_ID,
      null,
      'Sem request',
      supabase,
    );

    expect(result.success).toBe(true);
    // tb_upgrade_requests não deve ter sido chamado
    const calls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    expect(calls).not.toContain('tb_upgrade_requests');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('handleSubscriptionCancellation', () => {
  const PROFILE_ID = 'profile-xyz';
  const AUTH_RESULT = {
    success: true,
    userId: PROFILE_ID,
    profile: null,
    email: 'u@test.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue(AUTH_RESULT as never);
  });

  const setMockSupabase = (fromFn: ReturnType<typeof vi.fn>) => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: fromFn,
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  };

  it('❌ retorna erro quando não autenticado', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: false,
    } as never);

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
  });

  it('❌ retorna erro quando não há assinatura ativa', async () => {
    const fromFn = vi.fn().mockReturnValue(makeSelectSingle(null)); // maybeSingle → null
    setMockSupabase(fromFn);

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/assinatura/i);
  });

  it('✅ arrependimento ≤7d: estorna pagamento, cancela assinatura e rebaixa imediatamente', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const activeRequest = {
      id: 'req-1',
      status: 'approved',
      asaas_payment_id: 'pay-abc',
      asaas_subscription_id: 'sub-abc',
      created_at: daysAgo(3), // 3 dias atrás ≤ 7
      processed_at: daysAgo(3),
      billing_period: 'monthly',
      plan_key_requested: 'PRO',
    };

    const fromFn = vi
      .fn()
      .mockReturnValueOnce(makeSelectSingle(activeRequest)) // buscar request ativo
      // performDowngradeToFree calls:
      .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' })) // select plan
      .mockReturnValueOnce(makeUpdate()) // update FREE
      .mockReturnValueOnce(makeInsert()) // history
      .mockReturnValueOnce(makeUpdate()) // request status
      .mockReturnValueOnce(makeSelectList([])); // galleries (0)

    setMockSupabase(fromFn);

    process.env.ASAAS_API_KEY = 'test-key';

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(true);
    expect(result.type).toBe('refund_immediate');
    // Deve ter chamado o estorno e o cancelamento no Asaas (2 POST/DELETE calls)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain('/refund');
    expect(mockFetch.mock.calls[1][0]).toContain('/subscriptions/sub-abc');
    expect(mockFetch.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  });

  it('✅ cancelamento padrão >7d: agenda pending_cancellation sem estorno', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const activeRequest = {
      id: 'req-2',
      status: 'approved',
      asaas_payment_id: 'pay-def',
      asaas_subscription_id: 'sub-def',
      created_at: daysAgo(20),
      processed_at: daysAgo(20),
      billing_period: 'monthly',
      plan_key_requested: 'PRO',
    };

    const requestUpdateBuilder = makeUpdate();
    const historyInsertBuilder = makeInsert();

    const fromFn = vi
      .fn()
      .mockReturnValueOnce(makeSelectSingle(activeRequest))
      .mockReturnValueOnce(requestUpdateBuilder) // update pending_cancellation
      .mockReturnValueOnce(historyInsertBuilder); // plan_history insert

    setMockSupabase(fromFn);

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(true);
    expect(result.type).toBe('scheduled_cancellation');
    expect(result.access_ends_at).toBeDefined();

    // Deve ter chamado apenas DELETE (cancelamento, não estorno)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });

    // Status deve ter sido atualizado para pending_cancellation
    expect(requestUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending_cancellation' }),
    );
  });

  it('✅ já em pending_cancellation: retorna access_ends_at sem novos writes', async () => {
    const pendingRequest = {
      id: 'req-3',
      status: 'pending_cancellation',
      asaas_payment_id: 'pay-ghi',
      asaas_subscription_id: 'sub-ghi',
      created_at: daysAgo(10),
      processed_at: daysAgo(10),
      billing_period: 'monthly',
      plan_key_requested: 'PRO',
    };

    const fromFn = vi
      .fn()
      .mockReturnValueOnce(makeSelectSingle(pendingRequest));
    setMockSupabase(fromFn);

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(true);
    expect(result.type).toBe('scheduled_cancellation');
    expect(result.access_ends_at).toBeDefined();
    // Apenas 1 chamada ao from (select), sem escritas
    expect(fromFn).toHaveBeenCalledTimes(1);
  });

  it('✅ access_ends_at calculado corretamente para billing_period annual', async () => {
    const activeRequest = {
      id: 'req-4',
      status: 'approved',
      asaas_payment_id: 'pay-jkl',
      asaas_subscription_id: 'sub-jkl',
      created_at: daysAgo(30),
      processed_at: daysAgo(30),
      billing_period: 'annual',
      plan_key_requested: 'PRO',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    const requestUpdateBuilder = makeUpdate();
    const fromFn = vi
      .fn()
      .mockReturnValueOnce(makeSelectSingle(activeRequest))
      .mockReturnValueOnce(requestUpdateBuilder)
      .mockReturnValueOnce(makeInsert());

    setMockSupabase(fromFn);

    const result = await handleSubscriptionCancellation();

    expect(result.success).toBe(true);
    expect(result.type).toBe('scheduled_cancellation');
    // access_ends_at deve ser ~12 meses a partir do processed_at (30 dias atrás)
    const endsAt = new Date(result.access_ends_at!);
    const expectedMin = new Date(daysAgo(30));
    expectedMin.setMonth(expectedMin.getMonth() + 12);
    // Tolerância de 1 dia
    expect(Math.abs(endsAt.getTime() - expectedMin.getTime())).toBeLessThan(
      2 * 24 * 60 * 60 * 1000,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('checkAndApplyExpiredSubscriptions', () => {
  const PROFILE_ID = 'profile-check';
  const AUTH_RESULT = {
    success: true,
    userId: PROFILE_ID,
    profile: null,
    email: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue(AUTH_RESULT as never);
  });

  const setMockSupabase = (fromFn: ReturnType<typeof vi.fn>) => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: fromFn,
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  };

  it('✅ período expirado → aplica downgrade e retorna applied=true', async () => {
    // Assinatura mensal com processed_at há 35 dias → expirada
    const expiredRequest = {
      id: 'req-exp',
      created_at: monthsAgo(2),
      processed_at: monthsAgo(2),
      billing_period: 'monthly',
      plan_key_requested: 'PRO',
    };

    const fromFn = vi
      .fn()
      .mockReturnValueOnce(makeSelectSingle(expiredRequest)) // pending_cancellation query
      .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' })) // performDowngrade: select plan
      .mockReturnValueOnce(makeUpdate()) // update FREE
      .mockReturnValueOnce(makeInsert()) // history
      .mockReturnValueOnce(makeUpdate()) // update request
      .mockReturnValueOnce(makeSelectList([])); // galleries

    setMockSupabase(fromFn);

    const result = await checkAndApplyExpiredSubscriptions(PROFILE_ID);

    expect(result.applied).toBe(true);
    expect(result.needs_adjustment).toBe(false);
  });

  it('✅ período ainda vigente → applied=false, sem writes', async () => {
    // Assinatura anual com processed_at há 30 dias → ainda tem 11 meses
    const activeRequest = {
      id: 'req-active',
      created_at: daysAgo(30),
      processed_at: daysAgo(30),
      billing_period: 'annual',
      plan_key_requested: 'PRO',
    };

    const fromFn = vi.fn().mockReturnValueOnce(makeSelectSingle(activeRequest));
    setMockSupabase(fromFn);

    const result = await checkAndApplyExpiredSubscriptions(PROFILE_ID);

    expect(result.applied).toBe(false);
    // Apenas 1 consulta (sem writes)
    expect(fromFn).toHaveBeenCalledTimes(1);
  });

  it('✅ sem registro pending_cancellation → applied=false', async () => {
    const fromFn = vi.fn().mockReturnValueOnce(makeSelectSingle(null));
    setMockSupabase(fromFn);

    const result = await checkAndApplyExpiredSubscriptions(PROFILE_ID);

    expect(result.applied).toBe(false);
    expect(result.needs_adjustment).toBe(false);
    expect(result.excess_galleries).toHaveLength(0);
  });

  it('✅ usa userId passado como parâmetro sem chamar getAuthenticatedUser', async () => {
    const fromFn = vi.fn().mockReturnValueOnce(makeSelectSingle(null));
    setMockSupabase(fromFn);

    await checkAndApplyExpiredSubscriptions('explicit-user-id');

    // getAuthenticatedUser não deve ter sido chamado (userId foi passado)
    expect(getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it('✅ sem userId e sem auth → retorna applied=false sem crash', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: false,
    } as never);
    const fromFn = vi.fn();
    setMockSupabase(fromFn);

    const result = await checkAndApplyExpiredSubscriptions();

    expect(result.applied).toBe(false);
    expect(fromFn).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Idempotência — chamadas repetidas do webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('✅ performDowngradeToFree é idempotente quando usuário já está FREE', async () => {
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelectSingle({ plan_key: 'FREE' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    // Chamada 1
    const r1 = await performDowngradeToFree(
      'u1',
      'req-1',
      'Evento 1',
      supabase,
    );
    // Chamada 2 (simula webhook duplicado; mock reiniciado entre chamadas)
    const supabase2 = {
      from: vi.fn().mockReturnValueOnce(makeSelectSingle({ plan_key: 'FREE' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    const r2 = await performDowngradeToFree(
      'u1',
      'req-1',
      'Evento 2',
      supabase2,
    );

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    // Nenhuma escrita foi feita em nenhuma das chamadas (plano já era FREE)
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase2.from).toHaveBeenCalledTimes(1);
  });

  it('✅ SUBSCRIPTION_CANCELED duplicado: segunda chamada encontra status cancelled e retorna success', async () => {
    // Simula a situação onde o status já está 'cancelled' (primeiro webhook processado)
    // O webhook faz: if (status === 'pending_cancellation') → downgrade; else → no-op update
    // Aqui simulamos o caso onde o request já foi processado (status = 'cancelled')
    const alreadyCancelled = {
      id: 'req-dup',
      profile_id: 'profile-dup',
      status: 'cancelled',
    };

    // performDowngradeToFree verifica plan_key = FREE → retorna imediatamente
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelectSingle({ plan_key: 'FREE' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await performDowngradeToFree(
      alreadyCancelled.profile_id,
      alreadyCancelled.id,
      'Idempotência',
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.needs_adjustment).toBe(false);
    // Nenhuma escrita no DB
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('✅ excess_galleries ocultadas apenas uma vez mesmo com múltiplas chamadas', async () => {
    const galleries = [
      { id: 'g1', title: 'G1' },
      { id: 'g2', title: 'G2' },
      { id: 'g3', title: 'G3' },
      { id: 'g4', title: 'G4' }, // excedente
    ];

    const firstCallSupabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert())
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeSelectList(galleries))
        .mockReturnValueOnce(makeUpdate()), // hide g4
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const r1 = await performDowngradeToFree(
      'u2',
      'req-2',
      'First',
      firstCallSupabase,
    );
    expect(r1.excess_galleries).toHaveLength(1);

    // Segunda chamada: plano já é FREE (idempotente)
    const secondCallSupabase = {
      from: vi.fn().mockReturnValueOnce(makeSelectSingle({ plan_key: 'FREE' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const r2 = await performDowngradeToFree(
      'u2',
      'req-2',
      'Second',
      secondCallSupabase,
    );
    expect(r2.success).toBe(true);
    expect(r2.needs_adjustment).toBe(false);
    // Só 1 query na segunda chamada (early return)
    expect(secondCallSupabase.from).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Cálculo de limites de galerias (getNeedsAdjustment via performDowngradeToFree)', () => {
  const makeSupabaseWithGalleries = (
    galleries: Array<{ id: string; title: string }>,
  ) =>
    ({
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert())
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeSelectList(galleries))
        .mockReturnValueOnce(makeUpdate()), // hide excess (só chamado se houver excesso)
    }) as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

  it('0 galerias → needs_adjustment false', async () => {
    const result = await performDowngradeToFree(
      'u',
      'r',
      'X',
      makeSupabaseWithGalleries([]),
    );
    expect(result.needs_adjustment).toBe(false);
    expect(result.excess_galleries).toHaveLength(0);
  });

  it('3 galerias (limite exato FREE) → needs_adjustment false', async () => {
    const result = await performDowngradeToFree(
      'u',
      'r',
      'X',
      makeSupabaseWithGalleries([
        { id: 'g1', title: 'A' },
        { id: 'g2', title: 'B' },
        { id: 'g3', title: 'C' },
      ]),
    );
    expect(result.needs_adjustment).toBe(false);
  });

  it('4 galerias → needs_adjustment true, 1 excedente (a mais antiga)', async () => {
    const galleries = [
      { id: 'g1', title: 'Antiga 1' }, // índice 0 → excedente se > 3
      { id: 'g2', title: 'Antiga 2' },
      { id: 'g3', title: 'Antiga 3' },
      { id: 'g4', title: 'Recente' }, // excedente
    ];
    const result = await performDowngradeToFree(
      'u',
      'r',
      'X',
      makeSupabaseWithGalleries(galleries),
    );
    expect(result.needs_adjustment).toBe(true);
    expect(result.excess_galleries).toHaveLength(1);
    expect(result.excess_galleries[0].id).toBe('g4');
  });

  it('10 galerias → 7 excedentes retornados', async () => {
    const galleries = Array.from({ length: 10 }, (_, i) => ({
      id: `g${i + 1}`,
      title: `Galeria ${i + 1}`,
    }));
    const result = await performDowngradeToFree(
      'u',
      'r',
      'X',
      makeSupabaseWithGalleries(galleries),
    );
    expect(result.needs_adjustment).toBe(true);
    expect(result.excess_galleries).toHaveLength(7);
    expect(result.excess_galleries[0].id).toBe('g4');
    expect(result.excess_galleries[6].id).toBe('g10');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('reactivateAutoArchivedGalleries', () => {
  const PROFILE_ID = 'profile-xyz';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('respeita limite do plano: reativa até (maxGalleries - currentPublic)', async () => {
    const countBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count: 3, error: null }),
    };
    const listBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'g4' }, { id: 'g5' }],
      }),
    };
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await reactivateAutoArchivedGalleries(
      PROFILE_ID,
      'PRO',
      supabase,
    );

    expect(result.reactivated).toBe(2);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_public: true,
        auto_archived: false,
      }),
    );
    expect(updateBuilder.in).toHaveBeenCalledWith('id', ['g4', 'g5']);
  });

  it('retorna reactivated 0 quando não há galerias auto_archived', async () => {
    const countBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count: 5, error: null }),
    };
    const listBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(countBuilder).mockReturnValueOnce(listBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await reactivateAutoArchivedGalleries(
      PROFILE_ID,
      'PRO',
      supabase,
    );

    expect(result.reactivated).toBe(0);
  });

  it('não reativa mais que o limite do plano (ex: START max 12)', async () => {
    const countBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count: 10, error: null }),
    };
    const listBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'a1' }, { id: 'a2' }],
      }),
    };
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await reactivateAutoArchivedGalleries(
      PROFILE_ID,
      'START',
      supabase,
    );

    expect(result.reactivated).toBe(2);
    expect(updateBuilder.in).toHaveBeenCalledWith('id', ['a1', 'a2']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Ciclo de vida: Upgrade → Expiração → Downgrade (Ocultar) → Novo Upgrade (Reexibir)', () => {
  it('performDowngradeToFree oculta excedentes com is_public=false e auto_archived=true', async () => {
    const galleries = [
      { id: 'g1', title: 'G1' },
      { id: 'g2', title: 'G2' },
      { id: 'g3', title: 'G3' },
      { id: 'g4', title: 'G4' },
    ];
    const galeriasUpdateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ plan_key: 'PRO' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert())
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeSelectList(galleries))
        .mockReturnValueOnce(galeriasUpdateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    await performDowngradeToFree('uid', 'req-id', 'Expirou', supabase);

    expect(galeriasUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_public: false,
        auto_archived: true,
      }),
    );
  });

  it('reactivateAutoArchivedGalleries reexibe galerias respeitando MAX_GALLERIES do plano', async () => {
    const countBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };
    const listBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      }),
    };
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;

    const result = await reactivateAutoArchivedGalleries('uid', 'FREE', supabase);

    expect(result.reactivated).toBe(3);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_public: true, auto_archived: false }),
    );
  });
});
