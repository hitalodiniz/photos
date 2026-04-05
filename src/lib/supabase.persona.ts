/**
 * Regras de “persona” (admin visualiza/edita como outro usuário).
 * Não importar nada de servidor — seguro para `use client` e RSC.
 */

export type PersonaSupabaseMode = 'service_role' | 'user_session';

/**
 * Quando admin atua com `impersonateUserId`, leituras/escritas no servidor devem usar
 * service role (bypass RLS); a sessão do usuário alvo não existe no cookie.
 */
export function shouldUseServiceRoleForPersona(opts: {
  impersonateUserId?: string | null | undefined;
  actorIsAdmin: boolean;
}): boolean {
  return (
    opts.actorIsAdmin === true &&
    typeof opts.impersonateUserId === 'string' &&
    opts.impersonateUserId.trim().length > 0
  );
}

export function resolvePersonaSupabaseMode(opts: {
  impersonateUserId?: string | null | undefined;
  actorIsAdmin: boolean;
}): PersonaSupabaseMode {
  return shouldUseServiceRoleForPersona(opts)
    ? 'service_role'
    : 'user_session';
}

/** `profile_id` / `user_id` efetivo no dashboard com query `?impersonate=`. */
export function resolveEffectiveProfileIdForPersona(opts: {
  sessionProfileId: string;
  impersonateUserId?: string | null | undefined;
  actorIsAdmin: boolean;
}): string {
  if (
    shouldUseServiceRoleForPersona({
      impersonateUserId: opts.impersonateUserId,
      actorIsAdmin: opts.actorIsAdmin,
    })
  ) {
    return String(opts.impersonateUserId).trim();
  }
  return opts.sessionProfileId;
}
