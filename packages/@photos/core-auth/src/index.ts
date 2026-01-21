/**
 * 🛡️ API PÚBLICA DO PACOTE DE AUTENTICAÇÃO
 * 
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO ⚠️⚠️⚠️
 * 
 * Este é o ÚNICO ponto de entrada permitido para acessar serviços críticos.
 * 
 * ❌ NÃO IMPORTE ARQUIVOS INTERNOS DIRETAMENTE!
 * ✅ Use apenas os exports desta API pública.
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer alteração pode quebrar toda a aplicação
 * - Pode expor implementações internas
 * - Pode permitir acesso não autorizado
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia PROTECTION_SYSTEM.md
 * 2. Leia SERVICES_ARCHITECTURE.md
 * 3. Use flag --allow-critical-changes
 * 4. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

// ============================================================================
// SERVIÇOS DE AUTENTICAÇÃO
// ============================================================================

/**
 * Serviço central de autenticação
 * 
 * @example
 * ```typescript
 * import { authService } from '@photos/core-auth';
 * 
 * // Login
 * await authService.signInWithGoogle();
 * 
 * // Logout
 * await authService.signOut();
 * 
 * // Sessão
 * const session = await authService.getSession();
 * ```
 */
export { authService } from '@/core/services/auth.service';

/**
 * ⚠️ NOTA: Serviços do Google NÃO são exportados aqui porque são SERVER ONLY
 * 
 * Use as Server Actions em vez disso:
 * ```typescript
 * import { 
 *   getValidGoogleToken,
 *   getParentFolderIdServer,
 *   getDriveFolderName,
 *   checkFolderPublicPermission
 * } from '@/actions/google.actions';
 * 
 * const token = await getValidGoogleToken(userId);
 * ```
 * 
 * As funções originais estão disponíveis apenas em:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 */

/**
 * ⚠️ NOTA: Funções de limpeza de tokens NÃO são exportadas aqui porque são SERVER ONLY
 * 
 * Use as Server Actions em vez disso:
 * ```typescript
 * import { 
 *   quickCleanupTokens,
 *   fullCleanupTokens,
 *   customCleanupTokens
 * } from '@/actions/token-cleanup.actions';
 * 
 * // Limpeza rápida
 * const result = await quickCleanupTokens();
 * 
 * // Limpeza completa
 * const fullResult = await fullCleanupTokens();
 * ```
 * 
 * As funções originais estão disponíveis apenas em:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 */

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para obter sessão do Supabase
 * 
 * @example
 * ```typescript
 * import { useSupabaseSession } from '@photos/core-auth';
 * 
 * const { getAuthDetails, user, isLoading } = useSupabaseSession();
 * ```
 */
export { useSupabaseSession } from '@/hooks/useSupabaseSession';

// ============================================================================
// CONTEXTOS
// ============================================================================

/**
 * Contexto global de autenticação
 * 
 * @example
 * ```typescript
 * import { AuthProvider, useAuth } from '@photos/core-auth';
 * 
 * // No layout
 * <AuthProvider>
 *   {children}
 * </AuthProvider>
 * 
 * // No componente
 * const { user, isLoading } = useAuth();
 * ```
 */
export { AuthContext, AuthProvider, useAuth } from '@/contexts/AuthContext';

// ============================================================================
// LÓGICA DE AUTORIZAÇÃO
// ============================================================================

/**
 * ⚠️ NOTA: authenticateGaleriaAccess NÃO é exportado aqui porque usa next/headers
 * 
 * Use a Server Action em vez disso:
 * ```typescript
 * import { authenticateGaleriaAccessAction } from '@/actions/auth.actions';
 * 
 * const result = await authenticateGaleriaAccessAction(galeriaId, fullSlug, password);
 * ```
 * 
 * A função authenticateGaleriaAccess está disponível apenas em:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 */

// ============================================================================
// ❌ NÃO EXPORTE:
// - lib/supabase.client.ts (uso interno)
// - lib/supabase.server.ts (uso interno)
// - lib/google-auth.ts (uso interno)
// - Implementações internas de serviços
// - Utilitários internos
// ============================================================================
