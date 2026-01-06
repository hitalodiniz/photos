import { describe, it, expect } from 'vitest';
import { suggestUsernameFromEmail } from './userUtils';

describe('userUtils - suggestUsernameFromEmail', () => {
  it('deve retornar uma string vazia se o email for undefined ou vazio', () => {
    expect(suggestUsernameFromEmail(undefined)).toBe('');
    expect(suggestUsernameFromEmail('')).toBe('');
  });

  it('deve extrair a parte antes do @ e converter para minúsculas', () => {
    expect(suggestUsernameFromEmail('Hitalo.Diniz@exemplo.com')).toBe(
      'hitalo.diniz',
    );
  });

  it('deve remover acentos e caracteres especiais do prefixo', () => {
    // Cobre a normalização NFD e substituição de regex
    expect(suggestUsernameFromEmail('João.Vítor!2024@gmail.com')).toBe(
      'joao.vitor2024',
    );
    expect(suggestUsernameFromEmail('café_com_leite@provedor.com')).toBe(
      'cafe_com_leite',
    );
  });

  it('deve remover pontos e underscores do início e do fim', () => {
    // Cobre a limpeza de caracteres de pontuação nas extremidades
    expect(suggestUsernameFromEmail('.user.name_@test.com')).toBe('user.name');
    expect(suggestUsernameFromEmail('__admin__@site.com')).toBe('admin');
  });

  it('deve retornar "fotografo_perfil" se o username resultar em vazio após a limpeza', () => {
    // Exemplo: email composto apenas por caracteres especiais que serão removidos
    expect(suggestUsernameFromEmail('!!!@exemplo.com')).toBe(
      'fotografo_perfil',
    );
    expect(suggestUsernameFromEmail(' @espaco.com')).toBe('fotografo_perfil');
  });

  it('deve manter números e underscores permitidos no meio do nome', () => {
    expect(suggestUsernameFromEmail('fotografo_2026_pro@dominio.com')).toBe(
      'fotografo_2026_pro',
    );
  });

  describe('userUtils - Cobertura 100%', () => {
    it('deve cobrir linha 10 (email vazio/null)', () => {
      expect(suggestUsernameFromEmail('')).toBe('');
      expect(suggestUsernameFromEmail(undefined)).toBe('');
    });

    it('deve cobrir linha 29 (username vazio vira fallback)', () => {
      // Caracteres que o regex remove totalmente
      expect(suggestUsernameFromEmail('!!!@teste.com')).toBe(
        'fotografo_perfil',
      );
    });

    it('deve sanitizar corretamente', () => {
      expect(suggestUsernameFromEmail('Hitalo.Diniz@exemplo.com')).toBe(
        'hitalo.diniz',
      );
    });
  });
});
