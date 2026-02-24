// utils/userUtils.ts (Nova função helper)

/**
 * Sugere um username limpo a partir do email fornecido pelo OAuth.
 * @param email Email do usuário (ex: 'Hitalo.Diniz@exemplo.com')
 * @returns Username sugerido (ex: 'hitalodiniz')
 */
export function suggestUsernameFromEmail(email: string | undefined): string {
  if (!email) {
    return '';
  }

  // 1. Pega a parte antes do '@'
  const prefix = email.split('@')[0];

  // 2. Remove caracteres especiais, acentuação e converte para minúsculas.
  // Isso imita a lógica de sanitização que o SQL Trigger deve fazer.
  let username = prefix
    .normalize('NFD') // Normaliza acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9_.]/g, '') // Permite apenas letras, números, _ e .
    .toLowerCase();

  // 3. Remove caracteres de pontuação do início ou fim
  username = username.replace(/^[._]+|[._]+$/g, '');

  // Se o resultado for vazio, sugere um nome genérico
  if (!username) {
    return 'fotografo_perfil';
  }

  return username;
}

export const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');

        // 1. AUMENTO DE RESOLUÇÃO (Padrão para Heros/Banners)
        // 1920px garante nitidez em telas Full HD.
        const MAX_WIDTH = 1920;

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // 2. MELHORIA NA RENDERIZAÇÃO
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        // 3. FORMATO E QUALIDADE
        // 'image/jpeg' com 0.9 costuma ter melhor preservação de cores que WebP em alguns navegadores
        // mas manteremos WebP pela performance, subindo para 0.92 (sweet spot de qualidade)
        canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.92);
      };
    };
  });
};
