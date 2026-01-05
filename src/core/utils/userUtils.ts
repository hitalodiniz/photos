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