import { describe, it, expect, vi } from 'vitest';
import {
  formatGalleryData,
  fetchDrivePhotos,
  fetchGalleryBySlug,
} from './gallery-logic';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { GaleriaRawResponse, DrivePhoto } from '@/types/galeria';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';

// MOCK DO SUPABASE
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClientReadOnly: vi.fn(),
}));

vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');

describe('formatGalleryData', () => {
  it('deve formatar corretamente os dados brutos do Supabase', () => {
    // Usamos Partial para não precisar preencher todos os campos do banco no mock
    const mockRaw = {
      id: '123',
      title: 'Galeria Teste',
      photographer: {
        full_name: 'João Fotógrafo',
        username: 'joao123',
      },
    } as GaleriaRawResponse;

    const resultado = formatGalleryData(mockRaw, 'joao123');

    expect(resultado.photographer_name).toBe('João Fotógrafo');
    expect(resultado.id).toBe('123');
  });

  it('deve usar valores padrão quando o fotógrafo não tiver nome', () => {
    const mockRaw = { id: '123', title: 'Sem Foto' } as GaleriaRawResponse;
    const resultado = formatGalleryData(mockRaw, 'user_teste');

    expect(resultado.photographer_name).toBe('Fotógrafo');
  });
});

describe('fetchDrivePhotos', () => {
  it('deve retornar vazio se o token não for encontrado', async () => {
    vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(null);

    const photos = await fetchDrivePhotos('user_id', 'folder_id');

    expect(photos).toEqual([]);
    expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
      'user_id',
    );
  });

  it('deve retornar a lista de fotos quando o token é válido', async () => {
    // Tipagem explícita para evitar o 'any'
    const mockPhotos: DrivePhoto[] = [
      {
        id: 'img1',
        name: 'foto.jpg',
        thumbnailLink: '',
        webContentLink: '',
        mimeType: 'image/jpeg',
      },
    ];

    vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
      'token_valido',
    );
    vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
      mockPhotos,
    );

    const photos = await fetchDrivePhotos('user_id', 'folder_id');

    expect(photos).toHaveLength(1);
    expect(photos[0].id).toBe('img1');
  });
});

describe('fetchGalleryBySlug', () => {
  it('deve retornar os dados da galeria quando o slug existe', async () => {
    const mockData = { id: 'gal_1', title: 'Casamento' };

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };

    // Usamos 'unknown' como ponte para satisfazer o compilador sem usar 'any'
    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
      mockSupabase as unknown as ReturnType<
        typeof createSupabaseServerClientReadOnly
      >,
    );

    const result = await fetchGalleryBySlug('fotografo/casamento');

    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith('tb_galerias');
    expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'fotografo/casamento');
  });

  it('deve retornar null quando o Supabase retorna um erro', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };

    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
      mockSupabase as unknown as ReturnType<
        typeof createSupabaseServerClientReadOnly
      >,
    );

    const result = await fetchGalleryBySlug('slug/invalido');

    expect(result).toBeNull();
  });
});
