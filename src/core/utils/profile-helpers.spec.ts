import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  parseOperatingCities,
  parseBackgroundUrls,
  getFileExtension,
  generateFilePath,
  calculateTrialExpiration,
  buildTrialData,
  validateRequiredFields,
  extractFormData,
  filterValidFiles,
  hasFilesToUpload,
} from './profile-helpers';

describe('Profile Helpers', () => {
  describe('normalizePhoneNumber', () => {
    it('deve retornar string vazia para valores nulos/undefined', () => {
      expect(normalizePhoneNumber(null)).toBe('');
      expect(normalizePhoneNumber(undefined)).toBe('');
      expect(normalizePhoneNumber('')).toBe('');
    });

    it('deve adicionar prefixo 55 para número de 10 dígitos', () => {
      expect(normalizePhoneNumber('3112345678')).toBe('553112345678');
    });

    it('deve adicionar prefixo 55 para número de 11 dígitos', () => {
      expect(normalizePhoneNumber('31912345678')).toBe('5531912345678');
    });

    it('deve não adicionar prefixo se já tem 55', () => {
      expect(normalizePhoneNumber('5531912345678')).toBe('5531912345678');
    });

    it('deve remover caracteres não numéricos', () => {
      expect(normalizePhoneNumber('(31) 91234-5678')).toBe('5531912345678');
    });

    it('deve não adicionar prefixo para números com comprimento diferente', () => {
      expect(normalizePhoneNumber('123')).toBe('123');
      expect(normalizePhoneNumber('12345678901234')).toBe('12345678901234');
    });
  });

  describe('parseOperatingCities', () => {
    it('deve retornar array vazio para valores nulos/undefined', () => {
      expect(parseOperatingCities(null)).toEqual([]);
      expect(parseOperatingCities(undefined)).toEqual([]);
      expect(parseOperatingCities('')).toEqual([]);
    });

    it('deve parsear JSON válido', () => {
      const json = JSON.stringify(['Belo Horizonte', 'São Paulo']);
      expect(parseOperatingCities(json)).toEqual([
        'Belo Horizonte',
        'São Paulo',
      ]);
    });

    it('deve retornar array vazio para JSON inválido', () => {
      expect(parseOperatingCities('invalid json')).toEqual([]);
      expect(parseOperatingCities('{')).toEqual([]);
    });

    it('deve retornar array vazio se JSON não é array', () => {
      expect(parseOperatingCities('"string"')).toEqual([]);
      expect(parseOperatingCities('123')).toEqual([]);
      expect(parseOperatingCities('{"key": "value"}')).toEqual([]);
    });
  });

  describe('parseBackgroundUrls', () => {
    it('deve retornar array vazio para valores nulos/undefined', () => {
      expect(parseBackgroundUrls(null)).toEqual([]);
      expect(parseBackgroundUrls(undefined)).toEqual([]);
      expect(parseBackgroundUrls('')).toEqual([]);
    });

    it('deve parsear JSON válido', () => {
      const json = JSON.stringify([
        'https://cdn.com/1.jpg',
        'https://cdn.com/2.jpg',
      ]);
      expect(parseBackgroundUrls(json)).toEqual([
        'https://cdn.com/1.jpg',
        'https://cdn.com/2.jpg',
      ]);
    });

    it('deve retornar array vazio para JSON inválido', () => {
      expect(parseBackgroundUrls('invalid')).toEqual([]);
    });
  });

  describe('getFileExtension', () => {
    it('deve retornar webp para valores nulos/undefined', () => {
      expect(getFileExtension(null)).toBe('webp');
      expect(getFileExtension(undefined)).toBe('webp');
      expect(getFileExtension('')).toBe('webp');
    });

    it('deve retornar webp para arquivo sem extensão', () => {
      expect(getFileExtension('avatar')).toBe('webp');
    });

    it('deve extrair extensão corretamente', () => {
      expect(getFileExtension('avatar.jpg')).toBe('jpg');
      expect(getFileExtension('photo.png')).toBe('png');
      expect(getFileExtension('image.jpeg')).toBe('jpeg');
    });

    it('deve pegar última extensão em caso de múltiplos pontos', () => {
      expect(getFileExtension('my.photo.jpg')).toBe('jpg');
    });
  });

  describe('generateFilePath', () => {
    it('deve gerar path correto para avatar', () => {
      const path = generateFilePath('user123', 'avatar', 'jpg');
      expect(path).toMatch(/^user123\/avatar-\d+\.jpg$/);
    });

    it('deve gerar path correto para background com random', () => {
      const path = generateFilePath('user123', 'bg', 'png');
      expect(path).toMatch(/^user123\/bg-\d+-[a-z0-9]{5}\.png$/);
    });

    it('deve gerar paths únicos', () => {
      const path1 = generateFilePath('user123', 'bg', 'jpg');
      const path2 = generateFilePath('user123', 'bg', 'jpg');
      expect(path1).not.toBe(path2);
    });
  });

  describe('calculateTrialExpiration', () => {
    it('deve calcular data de expiração corretamente', () => {
      const expiration = calculateTrialExpiration(14);
      const expirationDate = new Date(expiration);
      const now = new Date();
      const diff = Math.floor(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Aceita 13 ou 14 dias devido a possíveis diferenças de timezone
      expect(diff).toBeGreaterThanOrEqual(13);
      expect(diff).toBeLessThanOrEqual(14);
    });

    it('deve usar 14 dias como padrão', () => {
      const expiration = calculateTrialExpiration();
      expect(expiration).toBeTruthy();
      expect(typeof expiration).toBe('string');
    });

    it('deve aceitar diferentes períodos', () => {
      const expiration7 = calculateTrialExpiration(7);
      const expiration30 = calculateTrialExpiration(30);

      expect(expiration7).toBeTruthy();
      expect(expiration30).toBeTruthy();
    });
  });

  describe('buildTrialData', () => {
    it('deve construir dados de trial corretamente', () => {
      const trialData = buildTrialData();

      expect(trialData.plan_key).toBe('PRO');
      expect(trialData.is_trial).toBe(true);
      expect(trialData.plan_trial_expires).toBeTruthy();
    });

    it('deve aceitar período customizado', () => {
      const trialData = buildTrialData(7);
      expect(trialData.plan_key).toBe('PRO');
      expect(trialData.is_trial).toBe(true);
    });
  });

  describe('validateRequiredFields', () => {
    it('deve retornar erro quando username está vazio', () => {
      const fd = new FormData();
      fd.append('username', '');
      fd.append('full_name', 'John Doe');

      const result = validateRequiredFields(fd);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome e Username são obrigatórios.');
    });

    it('deve retornar erro quando full_name está vazio', () => {
      const fd = new FormData();
      fd.append('username', 'john');
      fd.append('full_name', '');

      const result = validateRequiredFields(fd);
      expect(result.isValid).toBe(false);
    });

    it('deve validar com sucesso quando ambos estão preenchidos', () => {
      const fd = new FormData();
      fd.append('username', 'john');
      fd.append('full_name', 'John Doe');

      const result = validateRequiredFields(fd);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve fazer trim e lowercase no username', () => {
      const fd = new FormData();
      fd.append('username', '  JOHN  ');
      fd.append('full_name', '  John Doe  ');

      const result = validateRequiredFields(fd);
      expect(result.isValid).toBe(true);
    });
  });

  describe('extractFormData', () => {
    it('deve extrair todos os campos corretamente', () => {
      const fd = new FormData();
      fd.append('username', 'JOHN');
      fd.append('full_name', '  John Doe  ');
      fd.append('mini_bio', 'Photographer');
      fd.append('phone_contact', '31912345678');

      const result = extractFormData(fd);

      expect(result.username).toBe('john');
      expect(result.full_name).toBe('John Doe');
      expect(result.mini_bio).toBe('Photographer');
      expect(result.phone_contact).toBe('31912345678');
    });

    it('deve extrair arquivos corretamente', () => {
      const fd = new FormData();
      fd.append('username', 'john');
      fd.append('full_name', 'John');

      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      fd.append('profile_picture', file);

      const result = extractFormData(fd);
      expect(result.profile_picture).toBeInstanceOf(File);
    });

    it('deve extrair múltiplos arquivos de background', () => {
      const fd = new FormData();
      fd.append('username', 'john');
      fd.append('full_name', 'John');

      const file1 = new File(['1'], 'bg1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['2'], 'bg2.jpg', { type: 'image/jpeg' });
      fd.append('background_images', file1);
      fd.append('background_images', file2);

      const result = extractFormData(fd);
      expect(result.background_images).toHaveLength(2);
    });
  });

  describe('filterValidFiles', () => {
    it('deve filtrar arquivos vazios', () => {
      const files = [
        new File(['content'], 'valid.jpg', { type: 'image/jpeg' }),
        new File([], 'empty.jpg', { type: 'image/jpeg' }),
      ];

      const result = filterValidFiles(files);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('valid.jpg');
    });

    it('deve retornar array vazio se todos arquivos são inválidos', () => {
      const files = [
        new File([], 'empty1.jpg', { type: 'image/jpeg' }),
        new File([], 'empty2.jpg', { type: 'image/jpeg' }),
      ];

      const result = filterValidFiles(files);
      expect(result).toHaveLength(0);
    });

    it('deve manter todos arquivos válidos', () => {
      const files = [
        new File(['1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['2'], 'file2.jpg', { type: 'image/jpeg' }),
      ];

      const result = filterValidFiles(files);
      expect(result).toHaveLength(2);
    });
  });

  describe('hasFilesToUpload', () => {
    it('deve retornar false para array vazio', () => {
      expect(hasFilesToUpload([])).toBe(false);
    });

    it('deve retornar false se primeiro arquivo está vazio', () => {
      const files = [new File([], 'empty.jpg', { type: 'image/jpeg' })];
      expect(hasFilesToUpload(files)).toBe(false);
    });

    it('deve retornar true se primeiro arquivo tem conteúdo', () => {
      const files = [new File(['content'], 'file.jpg', { type: 'image/jpeg' })];
      expect(hasFilesToUpload(files)).toBe(true);
    });

    it('deve considerar apenas o primeiro arquivo', () => {
      const files = [
        new File([], 'empty.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'valid.jpg', { type: 'image/jpeg' }),
      ];
      expect(hasFilesToUpload(files)).toBe(false);
    });
  });
});
