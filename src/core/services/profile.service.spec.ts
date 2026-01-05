import { describe, it, expect, vi } from 'vitest';
import { profileService } from '@/core/services/profile.service';
import { supabase } from '@/lib/supabase.client';

vi.mock('@/lib/supabase.client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('ProfileService', () => {
  it('deve retornar a URL do avatar corretamente', async () => {
    const mockUrl = 'https://supabase.co/storage/v1/avatar.png';

    // Mock encadeado do Supabase
    const mockSingle = vi.fn().mockResolvedValue({
      data: { profile_picture_url: mockUrl },
      error: null,
    });

    // Mock do fluxo da query
    (supabase.from as any).mockReturnValue({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
    });

    const url = await profileService.getAvatarUrl('user_123');
    expect(url).toBe(mockUrl);
  });
});
