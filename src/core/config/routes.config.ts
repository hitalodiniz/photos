// core/config/routes.config.ts

{
  /* Script Anti-Flash: Executa antes de renderizar o body e não carrega o loadingscreen*/
}
export const LIGHT_ROUTES = [
  '/',
  '/privacidade',
  '/termos',
  '/privacidade',
  '/planos',
  '/auth/login',
  '/auth/reconnect',
  '/error',
];

// Função utilitária para verificar se a rota é leve (ajuda com rotas dinâmicas)
export const isLightRoute = (pathname: string) => {
  return LIGHT_ROUTES.includes(pathname);
};
