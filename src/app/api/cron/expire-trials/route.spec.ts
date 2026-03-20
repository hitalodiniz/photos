import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPerformDowngradeToFree = vi.fn();
const mockEnforcePhotoQuotaByArchivingOldest = vi.fn();
const mockCreateClient = vi.fn();

vi.mock('@/core/services/asaas.service', () => ({
  performDowngradeToFree: (...args: unknown[]) =>
    mockPerformDowngradeToFree(...args),
}));

vi.mock('@/core/services/asaas/gallery/quota-enforcement', () => ({
  enforcePhotoQuotaByArchivingOldest: (...args: unknown[]) =>
    mockEnforcePhotoQuotaByArchivingOldest(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

function makeSupabaseForExpireTrials() {
  const profilesBuilder = {
    select: vi.fn(() => profilesBuilder),
    eq: vi.fn(() => profilesBuilder),
    lt: vi.fn().mockResolvedValue({
      data: [{ id: 'u-1', username: 'alice' }],
      error: null,
    }),
  };

  const from = vi.fn((table: string) => {
    if (table === 'tb_profiles') return profilesBuilder;
    return profilesBuilder;
  });

  return { from };
}

describe('GET /api/cron/expire-trials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secret');

    mockPerformDowngradeToFree.mockResolvedValue({
      success: true,
      needs_adjustment: false,
      excess_galleries: [{ id: 'g1', title: 'Galeria 1' }],
    });
    mockEnforcePhotoQuotaByArchivingOldest.mockResolvedValue({
      archivedCount: 2,
      remainingTotal: 430,
      quota: 450,
    });
    mockCreateClient.mockReturnValue(makeSupabaseForExpireTrials());
  });

  it('aplica downgrade de trial expirado e reforça auto-arquivamento por cota', async () => {
    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/cron/expire-trials', {
      method: 'GET',
      headers: { authorization: 'Bearer secret' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.processedCount).toBe(1);

    expect(mockPerformDowngradeToFree).toHaveBeenCalledWith(
      'u-1',
      null,
      'Expiração automática de período de teste (Trial)',
      expect.any(Object),
    );
    expect(mockEnforcePhotoQuotaByArchivingOldest).toHaveBeenCalledWith(
      expect.any(Object),
      'u-1',
      'FREE',
    );
    expect(json.details?.[0]).toEqual(
      expect.objectContaining({
        username: 'alice',
        success: true,
        archivedGalleries: 1,
        extraArchivedByTotalQuota: 2,
        remainingTotalAfterArchive: 430,
      }),
    );
  });
});
