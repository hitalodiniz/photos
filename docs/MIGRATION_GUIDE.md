# 🔄 GUIA DE MIGRAÇÃO: Usando @photos/core-auth

## 📦 O QUE MUDOU?

Criamos um **pacote protegido** `@photos/core-auth` que encapsula todos os arquivos críticos.

**Agora você DEVE usar apenas a API pública do pacote!**

---

## ✅ COMO MIGRAR

### Antes (❌ NÃO FAÇA MAIS)

```typescript
// ❌ ERRADO: Import direto de arquivo crítico
import { authService } from '@/core/services/auth.service';
import { supabase } from '@/lib/supabase.client';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authenticateGaleriaAccess } from '@/core/logic/auth-gallery';
```

### Depois (✅ FAÇA ASSIM)

```typescript
// ✅ CORRETO: Import via API pública do pacote
import { 
  authService,
  useSupabaseSession,
  AuthProvider,
  useAuth,
  authenticateGaleriaAccess,
  getValidGoogleTokenService
} from '@photos/core-auth';
```

---

## 📋 MIGRAÇÃO POR ARQUIVO

### 1. Serviços de Autenticação

```typescript
// ❌ ANTES
import { authService } from '@/core/services/auth.service';

// ✅ DEPOIS
import { authService } from '@photos/core-auth';
```

### 2. Cliente Supabase

```typescript
// ❌ ANTES
import { supabase } from '@/lib/supabase.client';
import { createSupabaseServerClient } from '@/lib/supabase.server';

// ✅ DEPOIS
// ⚠️ ATENÇÃO: Clientes Supabase são internos!
// Use authService ou hooks do pacote em vez de acessar diretamente
import { authService } from '@photos/core-auth';
const session = await authService.getSession();
```

### 3. Hooks

```typescript
// ❌ ANTES
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

// ✅ DEPOIS
import { useSupabaseSession } from '@photos/core-auth';
```

### 4. Contextos

```typescript
// ❌ ANTES
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// ✅ DEPOIS
import { AuthProvider, useAuth } from '@photos/core-auth';
```

### 5. Lógica de Autorização

```typescript
// ❌ ANTES
import { authenticateGaleriaAccess } from '@/core/logic/auth-gallery';

// ✅ DEPOIS
import { authenticateGaleriaAccess } from '@photos/core-auth';
```

### 6. Serviços do Google

```typescript
// ❌ ANTES
import { getValidGoogleTokenService } from '@/core/services/google.service';

// ✅ DEPOIS
import { getValidGoogleTokenService } from '@photos/core-auth';
```

---

## 🔍 COMO ENCONTRAR IMPORTS A MIGRAR

### Buscar no código:

```bash
# Buscar imports diretos de serviços críticos
grep -r "from '@/core/services/auth.service" src/
grep -r "from '@/lib/supabase.client" src/
grep -r "from '@/hooks/useSupabaseSession" src/
grep -r "from '@/contexts/AuthContext" src/
```

### ESLint vai avisar:

O ESLint agora bloqueia imports diretos e mostra erro:
```
❌ NÃO IMPORTE ARQUIVOS CRÍTICOS DIRETAMENTE! 
Use apenas a API pública: import { ... } from '@photos/core-auth'
```

---

## 🛡️ PROTEÇÕES ATIVAS

1. **ESLint**: Bloqueia imports diretos em tempo de desenvolvimento
2. **Pre-commit**: Valida antes de commitar
3. **TypeScript**: Path mapping bloqueia imports internos
4. **Documentação**: API pública bem documentada

---

## 📚 API PÚBLICA COMPLETA

### Serviços
- `authService` - Serviço de autenticação
- `getValidGoogleTokenService` - Tokens do Google
- `validateRefreshToken` - Validação de tokens

### Hooks
- `useSupabaseSession` - Hook de sessão

### Contextos
- `AuthProvider` - Provider de autenticação
- `useAuth` - Hook de contexto de autenticação

### Lógica
- `authenticateGaleriaAccess` - Autenticação de galerias

---

## ⚠️ EXCEÇÕES

**Arquivos que AINDA podem importar diretamente:**
- `src/middleware.ts` (precisa de acesso direto)
- `src/app/api/auth/callback/route.ts` (rota de callback)
- `src/app/api/auth/google/route.ts` (rota de login)
- Arquivos dentro de `packages/@photos/core-auth/` (implementação interna)

**Estes arquivos são protegidos por outros mecanismos!**

---

## 🚀 PRÓXIMOS PASSOS

1. **Migre imports gradualmente**
   - Comece pelos mais usados
   - Teste após cada migração
   - Valide que tudo funciona

2. **Valide com ESLint**
   ```bash
   npm run lint
   ```

3. **Teste tudo**
   ```bash
   npm test
   npm run test:critical
   ```

---

## 📞 DÚVIDAS?

- Leia `SERVICES_ARCHITECTURE.md`
- Leia `PROTECTION_SYSTEM.md`
- Consulte a API pública em `packages/@photos/core-auth/src/index.ts`

**LEMBRE-SE: Use apenas a API pública do pacote!**
