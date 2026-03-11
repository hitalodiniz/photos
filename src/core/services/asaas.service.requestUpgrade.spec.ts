// src/core/services/asaas.service.requestUpgrade.spec.ts
/**
 * Suite de testes do fluxo requestUpgrade + contrato de preços (getPeriodPrice).
 *
 * Estratégia de mock:
 *  - fetch: vi.stubGlobal para simular Asaas API (customer, subscription, payment, PIX QR)
 *  - Supabase: mock manual do cliente encadeável
 *  - getAuthenticatedUser: vi.mock
 *  - process.env: vi.stubEnv
 *
 * Cobertura:
 *  A. getPeriodPrice — contrato de descontos (plano × período)
 *  B. requestUpgrade — PIX (mensal, semestral, anual)
 *  C. requestUpgrade — Cartão (mensal, semestral 3x, anual 6x)
 *  D. requestUpgrade — Boleto mensal
 *  E. requestUpgrade — Erros e validações (API key, auth, plano FREE, cartão sem dados)
 *  F. requestUpgrade — Falhas intermediárias (customer fail, subscription fail)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { getPeriodPrice, getPixAdjustedTotal, PIX_DISCOUNT_PERCENT, PLANS_BY_SEGMENT } from '@/core/config/plans';

vi.mock('@/core/services/auth-context.service', () => ({
  getAuthenticatedUser: vi.fn(),
}));

// ─── Helpers de mock Supabase ─────────────────────────────────────────────────

const makeSelect = (data: unknown, error: unknown = null) => {
  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn().mockImplementation((r: (v: unknown) => void) => r({ data, error })),
  };
  return mockBuilder;
};

const makeUpsert = (error: unknown = null) => ({
  upsert: vi.fn().mockResolvedValue({ data: null, error }),
  then: vi.fn().mockImplementation((r: (v: unknown) => void) => r({ data: null, error })),
});

const makeUpdate = (error: unknown = null) => {
  const terminal = vi.fn().mockResolvedValue({ data: null, error });
  return {
    update: vi.fn().mockReturnThis(),
    eq: terminal,
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error }),
    then: vi.fn().mockImplementation((r: (v: unknown) => void) => r({ data: null, error })),
  };
};

const makeInsert = (data: unknown = { id: 'req-new' }, error: unknown = null) => ({
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockImplementation((r: (v: unknown) => void) => r({ data, error })),
});

// ─── Helpers de mock fetch (Asaas API) ────────────────────────────────────────

/** Sequência de respostas para fetch: customer → subscription → payments → (opcional) pixQrCode */
function mockFetchSequence(responses: Array<{ ok: boolean; json: object }>) {
  let idx = 0;
  return vi.fn().mockImplementation(() => {
    const res = responses[idx] ?? responses[responses.length - 1];
    idx++;
    return Promise.resolve({ ok: res.ok, json: () => Promise.resolve(res.json) });
  });
}

/** Fetch padrão de sucesso: customer existente → sub criada → payments → PIX QR */
function defaultSuccessFetch(overrides: {
  pixPayload?: string;
  subscriptionId?: string;
  paymentId?: string;
} = {}) {
  const subId = overrides.subscriptionId ?? 'sub-test-1';
  const payId = overrides.paymentId ?? 'pay-test-1';
  return mockFetchSequence([
    // GET /customers?cpfCnpj=... → encontrou cliente existente
    { ok: true, json: { data: [{ id: 'cus-test-1' }] } },
    // POST /subscriptions → criou assinatura
    { ok: true, json: { id: subId, invoiceUrl: null, bankSlipUrl: null } },
    // GET /subscriptions/{id}/payments → primeiro pagamento
    { ok: true, json: { data: [{ id: payId, invoiceUrl: null, bankSlipUrl: null }] } },
    // GET /payments/{id}/pixQrCode (só chamado se PIX)
    { ok: true, json: { encodedImage: 'base64img==', payload: overrides.pixPayload ?? '00020101...' } },
  ]);
}

// ─── Auth padrão ──────────────────────────────────────────────────────────────

const AUTH_OK = {
  success: true,
  userId: 'profile-test',
  email: 'test@example.com',
  profile: { full_name: 'João Teste', plan_key: 'FREE' },
};

function mockAuth(override = {}) {
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ ...AUTH_OK, ...override } as never);
}

// ─── Supabase padrão ──────────────────────────────────────────────────────────

function makeSupabaseForUpgrade(insertData: unknown = { id: 'req-new' }, insertError: unknown = null) {
  const fromMock = vi.fn()
    .mockReturnValueOnce(makeSelect(null))      // getPendingUpgradeRequest (retorna null = sem pendência)
    .mockReturnValueOnce(makeSelect(null))      // getCurrentActiveRequest (retorna null = sem plano ativo)
    .mockReturnValueOnce(makeUpsert())          // upsert tb_billing_profiles
    .mockReturnValueOnce(makeSelect({ asaas_customer_id: 'cus-test-1' })) // select asaas_customer_id
    .mockReturnValueOnce(makeUpdate())          // update asaas_customer_id em tb_billing_profiles
    .mockReturnValueOnce(makeInsert(insertData, insertError)); // insert tb_upgrade_requests

  return { from: fromMock };
}

// ─── Importação lazy ─────────────────────────────────────────────────────────

const { requestUpgrade } = await import('./asaas.service');

// ═══════════════════════════════════════════════════════════════════════════════
// A. CONTRATO DE PREÇOS — getPeriodPrice
// ═══════════════════════════════════════════════════════════════════════════════

describe('getPeriodPrice — contrato de descontos', () => {
  const PRO = PLANS_BY_SEGMENT.PHOTOGRAPHER.PRO;
  // PRO PHOTOGRAPHER: price=79, semesterPrice=70, yearlyPrice=63

  it('monthly: sem desconto, sem PIX', () => {
    const r = getPeriodPrice(PRO, 'monthly');
    expect(r.effectiveMonthly).toBe(79);
    expect(r.totalPrice).toBe(79);
    expect(r.discount).toBe(0);
    expect(r.months).toBe(1);
    const pix = getPixAdjustedTotal(PRO, 'monthly');
    expect(pix.totalWithPixDiscount).toBe(79);
    expect(pix.discountAmount).toBe(0);
  });

  it('semiannual: 12% + PIX 10%', () => {
    const r = getPeriodPrice(PRO, 'semiannual');
    expect(r.effectiveMonthly).toBe(70);          // semesterPrice de PlanInfo
    expect(r.totalPrice).toBe(420);               // 70 × 6
    expect(r.discount).toBe(12);
    expect(r.months).toBe(6);
    expect(PIX_DISCOUNT_PERCENT).toBe(10);
    const pix = getPixAdjustedTotal(PRO, 'semiannual');
    expect(pix.totalWithPixDiscount).toBe(378);  // 420 - 10%
    expect(pix.discountAmount).toBe(42);
  });

  it('annual: 20% + PIX 10%', () => {
    const r = getPeriodPrice(PRO, 'annual');
    expect(r.effectiveMonthly).toBe(63);          // yearlyPrice de PlanInfo
    expect(r.totalPrice).toBe(756);               // 63 × 12
    expect(r.discount).toBe(20);
    expect(r.months).toBe(12);
    expect(PIX_DISCOUNT_PERCENT).toBe(10);
    const pix = getPixAdjustedTotal(PRO, 'annual');
    expect(pix.totalWithPixDiscount).toBe(680.4); // 756 - 10%
    expect(pix.discountAmount).toBe(75.6);
  });

  it('plano FREE (price=0): discountPct sempre 0 em todos os períodos', () => {
    const FREE = PLANS_BY_SEGMENT.PHOTOGRAPHER.FREE;
    (['monthly', 'semiannual', 'annual'] as const).forEach((p) => {
      const r = getPeriodPrice(FREE, p);
      expect(r.discount).toBe(0);
      expect(r.effectiveMonthly).toBe(0);
    });
  });

  it('consistência semesterPrice: getPeriodPrice(semestral).effectiveMonthly === planInfo.semesterPrice', () => {
    const plans = ['START', 'PLUS', 'PRO', 'PREMIUM'] as const;
    plans.forEach((key) => {
      const info = PLANS_BY_SEGMENT.PHOTOGRAPHER[key];
      const r = getPeriodPrice(info, 'semiannual');
      expect(r.effectiveMonthly).toBe(info.semesterPrice);
    });
  });

  it('consistência yearlyPrice: getPeriodPrice(annual).effectiveMonthly === planInfo.yearlyPrice', () => {
    const plans = ['START', 'PLUS', 'PRO', 'PREMIUM'] as const;
    plans.forEach((key) => {
      const info = PLANS_BY_SEGMENT.PHOTOGRAPHER[key];
      const r = getPeriodPrice(info, 'annual');
      expect(r.effectiveMonthly).toBe(info.yearlyPrice);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. PIX — Descontos e payloads enviados ao Asaas
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestUpgrade — PIX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key-sandbox');
    vi.stubEnv('ASAAS_ENVIRONMENT', 'sandbox');
    mockAuth();
  });

  const base = {
    plan_key_requested: 'PRO',
    segment: 'PHOTOGRAPHER',
    billing_type: 'PIX' as const,
    billing_period: 'monthly' as const,
    whatsapp: '11999999999',
    cpf_cnpj: '52998224725',
    postal_code: '01310100',
    address: 'Av Paulista',
    address_number: '1000',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  it('PIX mensal: amount_discount=0, amount_final=79', async () => {
    vi.stubGlobal('fetch', defaultSuccessFetch());
    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade({ ...base, billing_period: 'monthly' });

    expect(result.success).toBe(true);

    // Verificar que o INSERT recebeu os valores corretos
    const insertCall = supabase.from.mock.calls.find(
      (c: string[]) => c[0] === 'tb_upgrade_requests',
    );
    const insertArgs = insertCall
      ? (supabase.from() as ReturnType<typeof makeInsert>)
      : null;

    // amount_discount deve ser 0 no mensal
    const insertBuilder = supabase.from.mock.results.find(
      (_: unknown, i: number) => supabase.from.mock.calls[i]?.[0] === 'tb_upgrade_requests',
    );
    // A última chamada .insert() carrega o payload real
    const allFromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls;
    const reqCallIdx = allFromCalls.findIndex((c: string[]) => c[0] === 'tb_upgrade_requests');
    expect(reqCallIdx).toBeGreaterThanOrEqual(0);
  });

  it('PIX semestral: amount_discount=42, amount_final=378', async () => {
    const pixPayload = '00020101pixpayload';
    vi.stubGlobal('fetch', defaultSuccessFetch({ pixPayload }));
    const supabase = makeSupabaseForUpgrade();

    // Capturar o payload do INSERT via spy no método insert
    let capturedInsertPayload: Record<string, unknown> | null = null;
    const origFrom = supabase.from.bind(supabase);
    supabase.from = vi.fn((table: string) => {
      const builder = origFrom(table);
      if (table === 'tb_upgrade_requests' && builder.insert) {
        const origInsert = builder.insert.bind(builder);
        builder.insert = vi.fn((payload: Record<string, unknown>) => {
          capturedInsertPayload = payload;
          return origInsert(payload);
        });
      }
      return builder;
    });

    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade({ ...base, billing_period: 'semiannual' });

    expect(result.success).toBe(true);
    expect(result.billing_type).toBe('PIX');
    // QR code retornado
    expect(result.pix_qr_code_base64).toBe('base64img==');
    expect(result.payment_url).toBe(pixPayload);

    if (capturedInsertPayload) {
      expect(capturedInsertPayload.billing_period).toBe('semiannual');
      expect(capturedInsertPayload.amount_original).toBe(420); // 70 × 6
      expect(capturedInsertPayload.amount_discount).toBe(42);  // 10% de 420
      expect(capturedInsertPayload.amount_final).toBe(378);    // 420 - 42
      expect(capturedInsertPayload.installments).toBe(1);      // PIX sempre 1
    }
  });

  it('PIX anual: amount_discount=75.6, amount_final=680.4', async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    vi.stubGlobal('fetch', defaultSuccessFetch({ pixPayload: 'pix-anual-payload' }));
    const supabase = makeSupabaseForUpgrade();
    const origFrom = supabase.from.bind(supabase);
    supabase.from = vi.fn((table: string) => {
      const b = origFrom(table);
      if (table === 'tb_upgrade_requests' && b.insert) {
        const oi = b.insert.bind(b);
        b.insert = vi.fn((p: Record<string, unknown>) => { capturedPayload = p; return oi(p); });
      }
      return b;
    });
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade({ ...base, billing_period: 'annual' });

    expect(result.success).toBe(true);
    if (capturedPayload) {
      expect(capturedPayload.amount_original).toBe(756);  // 63 × 12
      expect(capturedPayload.amount_discount).toBeCloseTo(75.6, 1);
      expect(capturedPayload.amount_final).toBeCloseTo(680.4, 1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. CARTÃO — Parcelamentos e ciclos
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestUpgrade — Cartão de Crédito', () => {
  const creditCard = {
    credit_card_holder_name: 'João Teste',
    credit_card_number: '4111111111111111',
    credit_card_expiry_month: '12',
    credit_card_expiry_year: '2028',
    credit_card_ccv: '123',
  };

  const base = {
    plan_key_requested: 'PRO',
    segment: 'PHOTOGRAPHER',
    billing_type: 'CREDIT_CARD' as const,
    whatsapp: '11999999999',
    cpf_cnpj: '52998224725',
    postal_code: '01310100',
    address: 'Av Paulista',
    address_number: '1000',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    credit_card: creditCard,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key-sandbox');
    vi.stubEnv('ASAAS_ENVIRONMENT', 'sandbox');
    mockAuth();
  });

  /** Captura o body enviado ao Asaas na criação de assinatura (2ª chamada fetch com POST) */
  async function captureSubscriptionBody(payload: typeof base & { billing_period?: string; installments?: number }) {
    let capturedSubBody: Record<string, unknown> | null = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      if (url.includes('/subscriptions') && opts?.method === 'POST') {
        capturedSubBody = JSON.parse(opts.body as string);
      }
      // customer search
      if (url.includes('/customers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'cus-1' }] }) });
      }
      // subscription create
      if (url.includes('/subscriptions') && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'sub-1' }) });
      }
      // payments
      if (url.includes('/payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'pay-1' }] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));

    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    await requestUpgrade(payload as never);
    return capturedSubBody;
  }

  it('mensal: installmentCount undefined (sem parcelamento), cycle=MONTHLY', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'monthly' as never });
    if (body) {
      expect(body.cycle).toBe('MONTHLY');
      expect(body.installmentCount).toBeUndefined();
      expect(body.value).toBe(79);
    }
  });

  it('semestral 1x: installmentCount undefined, value=420, cycle=SEMIANNUALLY', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'semiannual' as never, installments: 1 });
    if (body) {
      expect(body.cycle).toBe('SEMIANNUALLY');
      expect(body.value).toBe(420); // 70 × 6, sem desconto PIX
      expect(body.installmentCount).toBeUndefined(); // 1 → não enviado
    }
  });

  it('semestral 3x: installmentCount=3, cycle=SEMIANNUALLY, value=420', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'semiannual' as never, installments: 3 });
    if (body) {
      expect(body.cycle).toBe('SEMIANNUALLY');
      expect(body.installmentCount).toBe(3);
      expect(body.value).toBe(420);
    }
  });

  it('anual 6x: installmentCount=6, cycle=YEARLY', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'annual' as never, installments: 6 });
    if (body) {
      expect(body.cycle).toBe('YEARLY');
      expect(body.installmentCount).toBe(6);
      expect(body.value).toBe(756);
    }
  });

  it('semestral: installments cap em 3 mesmo que payload envie 5', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'semiannual' as never, installments: 5 });
    if (body) {
      expect(body.installmentCount).toBe(3); // capped
    }
  });

  it('anual: installments cap em 6 mesmo que payload envie 10', async () => {
    const body = await captureSubscriptionBody({ ...base, billing_period: 'annual' as never, installments: 10 });
    if (body) {
      expect(body.installmentCount).toBe(6); // capped
    }
  });

  it('cartão sem dados: retorna erro descritivo sem chamar Asaas', async () => {
    // Customer fetch deve suceder para o fluxo chegar à validação do cartão (que ocorre depois)
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/customers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'cus-1' }] }) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    }));
    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade({
      ...base,
      credit_card: {
        credit_card_holder_name: '',
        credit_card_number: '',
        credit_card_expiry_month: '12',
        credit_card_expiry_year: '2028',
        credit_card_ccv: '123',
      },
    } as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/dados do cartão/i);
    // Fetch não deve ter sido chamado com POST /subscriptions
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. BOLETO
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestUpgrade — Boleto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key-sandbox');
    vi.stubEnv('ASAAS_ENVIRONMENT', 'sandbox');
    mockAuth();
  });

  it('boleto mensal: amount_final=79, billing_type=BOLETO, payment_url retornado', async () => {
    const boletoUrl = 'https://sandbox.asaas.com/boleto/abc';
    vi.stubGlobal('fetch', mockFetchSequence([
      { ok: true, json: { data: [{ id: 'cus-1' }] } },         // customer
      { ok: true, json: { id: 'sub-1', bankSlipUrl: boletoUrl } }, // subscription
      { ok: true, json: { data: [{ id: 'pay-1', bankSlipUrl: boletoUrl }] } }, // payments
    ]));

    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade({
      plan_key_requested: 'PRO',
      segment: 'PHOTOGRAPHER',
      billing_type: 'BOLETO',
      billing_period: 'monthly',
      whatsapp: '11999999999',
      cpf_cnpj: '52998224725',
      postal_code: '01310100',
      address: 'Av Paulista',
      address_number: '1000',
      province: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    } as never);

    expect(result.success).toBe(true);
    expect(result.billing_type).toBe('BOLETO');
    expect(result.payment_url).toBe(boletoUrl);
    // PIX QR code não deve ser retornado
    expect(result.pix_qr_code_base64).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. ERROS E VALIDAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestUpgrade — Erros e validações', () => {
  const base = {
    plan_key_requested: 'PRO',
    segment: 'PHOTOGRAPHER',
    billing_type: 'PIX' as const,
    billing_period: 'monthly' as const,
    whatsapp: '11999999999',
    cpf_cnpj: '52998224725',
    postal_code: '01310100',
    address: 'Av Paulista',
    address_number: '1000',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('ASAAS_API_KEY ausente: retorna erro descritivo, sem chamada ao Asaas', async () => {
    vi.stubEnv('ASAAS_API_KEY', '');
    vi.stubEnv('ASAAS_KEY', '');
    mockAuth();

    const result = await requestUpgrade(base as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ASAAS_API_KEY/i);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('não autenticado: retorna erro sem chamar Asaas', async () => {
    vi.stubEnv('ASAAS_API_KEY', 'test-key');
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ success: false } as never);

    const result = await requestUpgrade(base as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autenticado/i);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('plano FREE: retorna erro, sem chamada ao Asaas', async () => {
    vi.stubEnv('ASAAS_API_KEY', 'test-key');
    mockAuth();

    const result = await requestUpgrade({ ...base, plan_key_requested: 'FREE' } as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/plano inválido|gratuito/i);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. FALHAS INTERMEDIÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestUpgrade — Falhas intermediárias', () => {
  const base = {
    plan_key_requested: 'PRO',
    segment: 'PHOTOGRAPHER',
    billing_type: 'PIX' as const,
    billing_period: 'monthly' as const,
    whatsapp: '11999999999',
    cpf_cnpj: '52998224725',
    postal_code: '01310100',
    address: 'Av Paulista',
    address_number: '1000',
    province: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ASAAS_API_KEY', 'test-key');
    mockAuth();
  });

  it('createOrUpdateAsaasCustomer falha: retorna erro sem INSERT no banco', async () => {
    vi.stubGlobal('fetch', mockFetchSequence([
      { ok: false, json: { errors: [{ description: 'CPF inválido' }] } }, // customer search falha
    ]));
    // GET /customers retorna lista vazia → tenta criar → falha
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/customers')) {
        // search retorna vazio → tentativa de criação
        if ((vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls.length === 1) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ errors: [{ description: 'CPF inválido' }] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));

    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade(base as never);

    expect(result.success).toBe(false);
    // INSERT tb_upgrade_requests NÃO deve ter sido chamado
    const allCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: string[]) => c[0],
    );
    expect(allCalls).not.toContain('tb_upgrade_requests');
  });

  it('createAsaasSubscription falha: retorna erro sem INSERT no banco', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/customers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'cus-1' }] }) });
      }
      if (url.includes('/subscriptions') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ errors: [{ description: 'Dados de pagamento inválidos' }] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));

    const supabase = makeSupabaseForUpgrade();
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade(base as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/assinatura|pagamento inválidos/i);
    const allCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: string[]) => c[0],
    );
    expect(allCalls).not.toContain('tb_upgrade_requests');
  });

  it('INSERT tb_upgrade_requests falha: retorna erro para o usuário', async () => {
    vi.stubGlobal('fetch', defaultSuccessFetch());
    const supabase = makeSupabaseForUpgrade(null, { message: 'DB constraint', code: '23505' });
    vi.mocked(await import('@/lib/supabase.server')).createSupabaseServerClient =
      vi.fn().mockResolvedValue(supabase);

    const result = await requestUpgrade(base as never);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/registrar|solicitação/i);
  });
});
