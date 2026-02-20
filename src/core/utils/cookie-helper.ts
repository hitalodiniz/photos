import { setCookie, getCookie, deleteCookie } from 'cookies-next';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN; // ex: localhost:3000 ou meuapp.com

export const setVisitorCookie = (value: string) => {
  // Remove a porta para o atributo domain (ex: localhost:3000 -> localhost)
  const domain = MAIN_DOMAIN?.split(':')[0];

  setCookie('visitor_id', value, {
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    path: '/',
    // No localhost o browser bloqueia domínios com ponto inicial.
    // Em produção, o ponto inicial (.meuapp.com) permite subdomínios.
    domain: domain === 'localhost' ? undefined : `.${domain}`,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

export { getCookie, deleteCookie };
