import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPerformDowngradeToFree = vi.fn();
const mockEnforcePhotoQuotaByArchivingOldest = vi.fn();
const mockCreateSupabaseAdmin = vi.fn();
const mockGetNeedsAdjustment = vi.fn();

vi.mock('@/core/services/theme-rollback.service', () => ({
  applyThemeRollbackForLowerPlan: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/core/services/asaas.service', () => ({
  performDowngradeToFree: (...args: unknown[]) =>
    mockPerformDowngradeToFree(...args),
}));

vi.mock('@/core/services/asaas/gallery/quota-enforcement', () => ({
  enforcePhotoQuotaByArchivingOldest: (...args: unknown[]) =>
    mockEnforcePhotoQuotaByArchivingOldest(...args),
}));

vi.mock('@/core/services/asaas/gallery/adjustments', () => ({
  getNeedsAdjustment: (...args: unknown[]) => mockGetNeedsAdjustment(...args),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseAdmin: () => mockCreateSupabaseAdmin(),
}));

vi.mock('@/core/services/asaas/api/subscriptions', () => ({
  getAsaasSubscription: vi.fn(),
}));

function makeSupabaseForApplyDowngrades() {
  let upgradeQueryOrderCalls = 0;

  const upgradeBuilder = {
    select: vi.fn(() => upgradeBuilder),
    eq: vi.fn(() => upgradeBuilder),
    not: vi.fn(() => upgradeBuilder),
    lte: vi.fn(() => upgradeBuilder),
    order: vi.fn(() => {
      upgradeQueryOrderCalls += 1;
      if (upgradeQueryOrderCalls === 1) {
        return Promise.resolve({
          data: [
            {
              id: 'req-1',
              profile_id: 'user-1',
              plan_key_requested: 'FREE',
              billing_period: 'monthly',
              processed_at: '2026-01-01T00:00:00Z',
              notes: null,
            },
          ],
          error: null,
        });
      }
      if (upgradeQueryOrderCalls === 2) {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };

  const from = vi.fn((table: string) => {
    if (table === 'tb_upgrade_requests') return upgradeBuilder;
    if (table === 'tb_profiles') {
      const profileBuilder = {
        select: vi.fn(() => profileBuilder),
        eq: vi.fn(() => profileBuilder),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { plan_key: 'PREMIUM' },
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: { plan_key: 'PRO', is_exempt: false, metadata: {} },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
      return profileBuilder;
    }
    if (table === 'tb_plan_history') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    if (table === 'tb_galerias') {
      return {
        update: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }
    return upgradeBuilder;
  });

  return { from, rpc: vi.fn().mockResolvedValue({ error: null }) };
}

function makeSupabaseForPendingChangeOnly() {
  let upgradeQueryOrderCalls = 0;

  const upgradeBuilder = {
    select: vi.fn(() => upgradeBuilder),
    eq: vi.fn(() => upgradeBuilder),
    not: vi.fn(() => upgradeBuilder),
    lte: vi.fn(() => upgradeBuilder),
    order: vi.fn(() => {
      upgradeQueryOrderCalls += 1;
      if (upgradeQueryOrderCalls === 1) return Promise.resolve({ data: [], error: null }); // pending_downgrade
      if (upgradeQueryOrderCalls === 2) return Promise.resolve({ data: [], error: null }); // pending_cancellation
      if (upgradeQueryOrderCalls === 3) return Promise.resolve({ data: [], error: null }); // overdue
      return Promise.resolve({
        data: [
          {
            id: 'pc-1',
            profile_id: 'user-pc',
            plan_key_current: 'PRO',
            plan_key_requested: 'START',
            billing_period: 'monthly',
            processed_at: '2026-01-01T00:00:00Z',
            asaas_subscription_id: 'sub-1',
          },
        ],
        error: null,
      }); // pending_change
    }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };

  const profileBuilder = {
    select: vi.fn(() => profileBuilder),
    eq: vi.fn(() => profileBuilder),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { plan_key: 'START' },
      error: null,
    }),
    single: vi.fn().mockResolvedValue({
      data: { plan_key: 'PRO', is_exempt: false, metadata: {} },
      error: null,
    }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };

  const from = vi.fn((table: string) => {
    if (table === 'tb_upgrade_requests') return upgradeBuilder;
    if (table === 'tb_profiles') return profileBuilder;
    if (table === 'tb_plan_history') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    if (table === 'tb_galerias') {
      return {
        update: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }
    return upgradeBuilder;
  });

  return { from, rpc: vi.fn().mockResolvedValue({ error: null }) };
}

describe('GET /api/cron/apply-downgrades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secret');

    mockPerformDowngradeToFree.mockResolvedValue({
      success: true,
      needs_adjustment: false,
      excess_galleries: [],
    });
    mockEnforcePhotoQuotaByArchivingOldest.mockResolvedValue({
      archivedCount: 1,
      remainingTotal: 400,
      quota: 450,
    });
    mockGetNeedsAdjustment.mockResolvedValue({
      needs_adjustment: false,
      excess_galleries: [],
    });
    mockCreateSupabaseAdmin.mockReturnValue(makeSupabaseForApplyDowngrades());
  });

  it('aplica downgrade e reforça arquivamento por cota total', async () => {
    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/cron/apply-downgrades', {
      method: 'GET',
      headers: { authorization: 'Bearer secret' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    expect(mockPerformDowngradeToFree).toHaveBeenCalledWith(
      'user-1',
      'req-1',
      expect.stringContaining('Downgrade automático (cron)'),
    );
    expect(mockEnforcePhotoQuotaByArchivingOldest).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      'FREE',
    );
  });

  it('pending_change aplicado também reforça quota usando o novo plano', async () => {
    mockCreateSupabaseAdmin.mockReturnValue(makeSupabaseForPendingChangeOnly());

    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/cron/apply-downgrades', {
      method: 'GET',
      headers: { authorization: 'Bearer secret' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    console.log('JSON:', json);
    if (json.errors && json.errors.length > 0) {
      console.log('ERRORS:', json.errors);
    }
    expect(mockPerformDowngradeToFree).not.toHaveBeenCalled();
    expect(mockEnforcePhotoQuotaByArchivingOldest).toHaveBeenCalledWith(
      expect.any(Object),
      'user-pc',
      'START',
    );
  });
});
