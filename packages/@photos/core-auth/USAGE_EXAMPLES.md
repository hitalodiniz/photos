# 📚 EXEMPLOS DE USO - @photos/core-auth

## ✅ EXEMPLOS CORRETOS

### 1. Login com Google

```typescript
import { authService } from '@photos/core-auth';

// Login padrão (rápido)
await authService.signInWithGoogle();

// Login com consent forçado (para obter refresh token)
await authService.signInWithGoogle(true);
```

### 2. Logout

```typescript
import { authService } from '@photos/core-auth';

await authService.signOut();
```

### 3. Obter Sessão

```typescript
import { authService } from '@photos/core-auth';

const session = await authService.getSession();
if (session) {
  console.log('Usuário logado:', session.user.email);
}
```

### 4. Hook de Sessão

```typescript
'use client';
import { useSupabaseSession } from '@photos/core-auth';

function MyComponent() {
  const { getAuthDetails, user, isLoading } = useSupabaseSession();
  
  const handleAction = async () => {
    const { userId, accessToken } = await getAuthDetails();
    // Usar userId e accessToken
  };
  
  if (isLoading) return <div>Carregando...</div>;
  if (!user) return <div>Não autenticado</div>;
  
  return <div>Olá, {user.email}</div>;
}
```

### 5. Contexto de Autenticação

```typescript
'use client';
import { AuthProvider, useAuth } from '@photos/core-auth';

// No layout
export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

// No componente
function MyComponent() {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <div>Carregando...</div>;
  if (!user) return <div>Não autenticado</div>;
  
  return (
    <div>
      <p>Olá, {user.email}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### 6. Autenticação de Galeria

```typescript
import { authenticateGaleriaAccess } from '@photos/core-auth';

const result = await authenticateGaleriaAccess(
  galeriaId,
  fullSlug,
  passwordInput
);

if (result.success) {
  // Acesso autorizado
  redirect(result.redirectUrl);
} else {
  // Senha incorreta
  return { error: result.error };
}
```

### 7. Token do Google

```typescript
import { getValidGoogleTokenService } from '@photos/core-auth';

const token = await getValidGoogleTokenService(userId);
if (token) {
  // Usar token para chamadas à API do Google
}
```

---

## ❌ EXEMPLOS ERRADOS (BLOQUEADOS)

### ❌ Import Direto de Serviço

```typescript
// ❌ ERRADO - ESLint vai bloquear
import { authService } from '@/core/services/auth.service';
```

### ❌ Import Direto de Cliente Supabase

```typescript
// ❌ ERRADO - ESLint vai bloquear
import { supabase } from '@/lib/supabase.client';
```

### ❌ Import Direto de Hook

```typescript
// ❌ ERRADO - ESLint vai bloquear
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
```

### ❌ Import Interno do Pacote

```typescript
// ❌ ERRADO - ESLint vai bloquear
import { supabase } from '@photos/core-auth/lib/supabase.client';
```

---

## 🛡️ O QUE ESTÁ PROTEGIDO

Todos estes arquivos estão protegidos e **NÃO PODEM** ser importados diretamente:

- ❌ `src/core/services/auth.service.ts`
- ❌ `src/core/services/google.service.ts`
- ❌ `src/core/services/token-cleanup.service.ts`
- ❌ `src/lib/supabase.client.ts`
- ❌ `src/lib/supabase.server.ts`
- ❌ `src/lib/google-auth.ts`
- ❌ `src/hooks/useSupabaseSession.ts`
- ❌ `src/contexts/AuthContext.tsx`
- ❌ `src/core/logic/auth-gallery.ts`
- ❌ `src/core/utils/google-oauth-throttle.ts`

**Use apenas a API pública do pacote!**

---

## 📖 MAIS INFORMAÇÕES

- `MIGRATION_GUIDE.md` - Como migrar imports existentes
- `SERVICES_ARCHITECTURE.md` - Arquitetura de serviços
- `PROTECTION_SYSTEM.md` - Sistema de proteção
