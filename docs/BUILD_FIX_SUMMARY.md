# 🔧 Correção de Build: Server-Only Exports

## ❌ Problema

O build estava falhando com o erro:
```
You're importing a component that needs "next/headers". That only works in a Server Component
```

## 🔍 Causa

O pacote `@photos/core-auth` estava exportando funções que usam `next/headers` (server-only), e essas funções estavam sendo incluídas no bundle do cliente quando componentes cliente importavam do pacote.

## ✅ Solução

Removidos os exports server-only do pacote e criadas Server Actions para acesso:

### 1. Removidos do Pacote (Server-Only)
- ❌ `getValidGoogleTokenService` e outros serviços do Google
- ❌ `cleanupGoogleTokens` e funções de limpeza
- ❌ `authenticateGaleriaAccess`

### 2. Criadas Server Actions
- ✅ `authenticateGaleriaAccessAction` em `@/actions/auth.actions`
- ✅ Funções do Google já existiam em `@/actions/google.actions`
- ✅ Funções de limpeza já existiam em `@/actions/token-cleanup.actions`

### 3. Atualizados Imports
- ✅ `PasswordPrompt.tsx` agora usa `authenticateGaleriaAccessAction`
- ✅ `google.actions.ts` importa diretamente de `@/core/services/google.service`
- ✅ `token-cleanup.actions.ts` importa diretamente de `@/core/services/token-cleanup.service`

## 📦 Exports do Pacote (Client-Safe)

Agora o pacote exporta **apenas** funções que podem ser usadas em componentes cliente:

- ✅ `authService` - Serviço de autenticação
- ✅ `useSupabaseSession` - Hook de sessão
- ✅ `AuthProvider`, `useAuth` - Contexto de autenticação

## 🎯 Resultado

✅ Build passando sem erros
✅ Separação clara entre client-safe e server-only
✅ Server Actions funcionando corretamente
