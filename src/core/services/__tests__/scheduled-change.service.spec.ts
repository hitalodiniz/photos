import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { createSupabaseServerClient } from '@/lib/supabase.server';

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseAdmin: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/core/services/auth-context.service', () => ({
  getAuthenticatedUser: vi.fn(),
}));
vi.mock('@/actions/revalidate.actions', () => ({
  revalidateUserCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/core/services/asaas/billing/billing-profile', () => ({
  upsertBillingProfile: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/core/services/asaas/api/customers', () => ({
  createOrUpdateAsaasCustomer: vi
    .fn()
    .mockResolvedValue({ success: true, customerId: 'cus_1' }),
}));

const makeSelectSingle = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data, error }),
  ),
});

const makeUpdate = (error: unknown = null) => {
  const terminal = vi.fn().mockResolvedValue({ data: null, error });
  return {
    update: vi.fn().mockReturnThis(),
    eq: terminal,
    in: terminal,
    neq: terminal,
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error }),
    ),
  };
};

const makeInsert = (data: unknown = { id: 'new-id' }, error: unknown = null) => ({
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data, error }),
  ),
});

const monthsAgo = (n: number) => {
  const d = nowFn();
  d.setMonth(d.getMonth() - n);
  return utcIsoFrom(d);
};
const daysAgo = (n: number) =>
  new Date(nowFn().getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const { getAuthenticatedUser } = await import('@/core/services/auth-context.service');
const { scheduleDowngradeChange, cancelScheduledChange } = await import('../scheduled-change.service');

describe('scheduleDowngradeChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_new' }) }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const payload = {
    plan_key_requested: 'START',
    billing_type: 'PIX' as const,
    billing_period: 'monthly' as const,
    full_name: 'User',
    installments: 1,
    whatsapp: '11999999999',
    cpf_cnpj: '52998224725',
    postal_code: '01310100',
    address: 'Rua A',
    address_number: '1',
    province: 'Centro',
    city: 'SP',
    state: 'SP',
  };

  const authOk = {
    success: true,
    userId: 'user-1',
    email: 'u@test.com',
    profile: { plan_key: 'PRO', full_name: 'User' },
  };

  it('❌ não autenticado → success=false', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ success: false } as never);
    const result = await scheduleDowngradeChange(payload);
    expect(result.success).toBe(false);
  });

  it('❌ plano alvo igual ao atual → success=false', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      ...authOk,
      profile: { plan_key: 'START', full_name: 'User' },
    } as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(makeSelectSingle(null)),
    } as never);
    const result = await scheduleDowngradeChange(payload);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/fluxo normal/i);
  });

  it('❌ já existe pending_change ativo → success=false', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authOk as never);
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle(null)) // pendingDowngradeBlock
        .mockReturnValueOnce(makeSelectSingle([{ id: 'approved', processed_at: daysAgo(10), billing_period: 'monthly', amount_final: 79, notes: null, asaas_subscription_id: 'sub_curr', plan_key_requested: 'PRO' }]))
        .mockReturnValueOnce(makeSelectSingle({ id: 'pending-change-1' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    const result = await scheduleDowngradeChange(payload);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/agendada/i);
  });

  it('✅ sucesso completo: POST + PUT + insert pending_change', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authOk as never);
    const insertPending = makeInsert({ id: 'pc1' });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle(null)) // pendingDowngradeBlock
        .mockReturnValueOnce(makeSelectSingle([{ id: 'approved-1', processed_at: daysAgo(10), billing_period: 'monthly', amount_final: 79, notes: null, asaas_subscription_id: 'sub_curr', plan_key_requested: 'PRO' }]))
        .mockReturnValueOnce(makeSelectSingle(null))
        .mockReturnValueOnce(makeSelectSingle({ asaas_customer_id: 'cus_1' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(insertPending),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub_asaas_new' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    const result = await scheduleDowngradeChange(payload);
    expect(result.success).toBe(true);
    expect(result.is_scheduled_change).toBe(true);
    expect(result.scheduled_change_effective_at).toBeDefined();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(supabase.from).toHaveBeenCalledWith('tb_upgrade_requests');
    expect(insertPending.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending_change' }),
    );
  });

  it('❌ falha ao setar endDate: cancela nova sub e retorna erro', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authOk as never);
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle(null)) // pendingDowngradeBlock
        .mockReturnValueOnce(makeSelectSingle([{ id: 'approved-1', processed_at: daysAgo(10), billing_period: 'monthly', amount_final: 79, notes: null, asaas_subscription_id: 'sub_curr', plan_key_requested: 'PRO' }]))
        .mockReturnValueOnce(makeSelectSingle(null))
        .mockReturnValueOnce(makeSelectSingle({ asaas_customer_id: 'cus_1' }))
        .mockReturnValueOnce(makeUpdate())
        .mockReturnValueOnce(makeInsert({ id: 'pc1' }, { message: 'db fail' })),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'sub_asaas_new' }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ description: 'err' }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const result = await scheduleDowngradeChange(payload);
    expect(result.success).toBe(false);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('cancelScheduledChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  it('❌ não autenticado → success=false', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ success: false } as never);
    const result = await cancelScheduledChange();
    expect(result.success).toBe(false);
  });

  it('❌ sem pending_change ativo → success=false', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: 'u1',
    } as never);
    const supabase = {
      from: vi.fn().mockReturnValueOnce(makeSelectSingle(null)),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    const result = await cancelScheduledChange();
    expect(result.success).toBe(false);
  });

  it('✅ sucesso completo: DELETE + PUT endDate null + status cancelled', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: 'u1',
    } as never);
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ id: 'pc1', asaas_subscription_id: 'sub_future', plan_key_current: 'PRO' }))
        .mockReturnValueOnce(makeSelectSingle({ asaas_subscription_id: 'sub_current' }))
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nextDueDate: '2026-05-01' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const result = await cancelScheduledChange();
    expect(result.success).toBeTruthy();
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('❌ falha ao cancelar nova sub no Asaas: success=false e banco não alterado', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: 'u1',
    } as never);
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ id: 'pc1', asaas_subscription_id: 'sub_future', plan_key_current: 'PRO' }))
        .mockReturnValueOnce(makeSelectSingle({ asaas_subscription_id: 'sub_current' }))
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ description: 'err' }] }) } as Response);
    const result = await cancelScheduledChange();
    expect(result.success).toBe(false);
    expect(updateBuilder.update).not.toHaveBeenCalled();
  });

  it('✅ falha ao remover endDate não bloqueia cancelamento', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: 'u1',
    } as never);
    const updateBuilder = makeUpdate();
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(makeSelectSingle({ id: 'pc1', asaas_subscription_id: 'sub_future', plan_key_current: 'PRO' }))
        .mockReturnValueOnce(makeSelectSingle({ asaas_subscription_id: 'sub_current' }))
        .mockReturnValueOnce(updateBuilder),
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ errors: [{ description: 'err' }] }) } as Response);
    const result = await cancelScheduledChange();
    expect(result.success).toBeTruthy();
    expect(updateBuilder.update).toHaveBeenCalled();
  });
});
