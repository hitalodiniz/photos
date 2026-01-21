# 🛡️ @photos/core-auth

## ⚠️ PACOTE CRÍTICO DE SEGURANÇA

Este pacote encapsula **TODOS** os arquivos críticos de autenticação, autorização e APIs do Google Drive.

**NÃO ALTERE ARQUIVOS INTERNOS DESTE PACOTE!**

---

## 📦 USO

### ✅ API Pública (ÚNICA FORMA PERMITIDA)

```typescript
// ✅ CORRETO: Use apenas a API pública (Client-Safe)
import { 
  authService,
  useSupabaseSession,
  AuthProvider,
  useAuth
} from '@photos/core-auth';

// Exemplo: Login
await authService.signInWithGoogle();

// Exemplo: Hook de sessão
const { getAuthDetails } = useSupabaseSession();

// Exemplo: Contexto de autenticação
const { user, isLoading } = useAuth();

// ⚠️ Para funções SERVER-ONLY, use Server Actions:
import { authenticateGaleriaAccessAction } from '@/actions/auth.actions';
import { getValidGoogleToken } from '@/actions/google.actions';
```

### ❌ NÃO FAÇA (Bloqueado)

```typescript
// ❌ ERRADO: Importar arquivos internos
import { supabase } from '@photos/core-auth/lib/supabase.client';
import { authService } from '@photos/core-auth/src/services/auth.service';

// ❌ ERRADO: Acessar implementação interna
// Código interno não está acessível!
```

---

## 🔒 ARQUIVOS PROTEGIDOS

Este pacote contém:
- ✅ Serviços de autenticação
- ✅ Clientes Supabase (browser e server)
- ✅ Hooks de sessão
- ✅ Contextos de autenticação
- ✅ Lógica de autorização
- ✅ Serviços do Google Drive
- ✅ Rate limiting

**Todos protegidos contra alterações acidentais!**

---

## 📚 DOCUMENTAÇÃO

- `CRITICAL_AUTH_FILES.md` - Lista de arquivos críticos
- `PROTECTION_SYSTEM.md` - Sistema de proteção
- `SERVICES_ARCHITECTURE.md` - Arquitetura de serviços

---

## 🚨 ALTERAÇÕES

**Para alterar este pacote:**
1. Leia `PROTECTION_SYSTEM.md`
2. Use flag `--allow-critical-changes`
3. Siga checklist obrigatório
4. Solicite revisão

**LEMBRE-SE: SEGURANÇA É PRIORIDADE MÁXIMA!**
