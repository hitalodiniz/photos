# 🚀 PLANO DE IMPLEMENTAÇÃO: Pacote NPM Interno

## 📦 ESTRUTURA PROPOSTA

```
photos/
├── packages/
│   └── @photos/core-auth/          # Pacote de autenticação crítico
│       ├── src/
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── google.service.ts
│       │   │   └── token-cleanup.service.ts
│       │   ├── lib/
│       │   │   ├── supabase.client.ts
│       │   │   ├── supabase.server.ts
│       │   │   └── google-auth.ts
│       │   ├── hooks/
│       │   │   └── useSupabaseSession.ts
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx
│       │   ├── logic/
│       │   │   └── auth-gallery.ts
│       │   └── index.ts            # API PÚBLICA (único export permitido)
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── src/                            # App principal
│   └── app/
└── package.json                    # Workspaces configurado
```

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### Passo 1: Configurar Monorepo

```json
// package.json (raiz)
{
  "name": "photos-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "src"
  ]
}
```

### Passo 2: Criar Pacote

```json
// packages/@photos/core-auth/package.json
{
  "name": "@photos/core-auth",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

### Passo 3: API Pública

```typescript
// packages/@photos/core-auth/src/index.ts
/**
 * 🛡️ API PÚBLICA DO PACOTE DE AUTENTICAÇÃO
 * 
 * ⚠️ NÃO IMPORTE ARQUIVOS INTERNOS DIRETAMENTE!
 * Use apenas os exports desta API pública.
 */

// Serviços
export { authService } from './services/auth.service';
export { getValidGoogleTokenService } from './services/google.service';
export { validateRefreshToken } from './services/token-cleanup.service';

// Hooks (apenas se necessário)
export { useSupabaseSession } from './hooks/useSupabaseSession';

// Contextos (apenas se necessário)
export { AuthContext, AuthProvider, useAuth } from './contexts/AuthContext';

// Lógica
export { authenticateGaleriaAccess } from './logic/auth-gallery';

// ❌ NÃO EXPORTE:
// - lib/supabase.client.ts (uso interno)
// - lib/supabase.server.ts (uso interno)
// - Implementações internas
```

### Passo 4: Proteção de Imports

```javascript
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@photos/core-auth/lib/*", "@photos/core-auth/src/*"],
            "message": "❌ Não importe arquivos internos! Use apenas a API pública: import { ... } from '@photos/core-auth'"
          }
        ]
      }
    ]
  }
}
```

### Passo 5: Atualizar Imports no App

```typescript
// ❌ ANTES (import direto)
import { supabase } from '@/lib/supabase.client';
import { authService } from '@/core/services/auth.service';

// ✅ DEPOIS (via pacote)
import { authService } from '@photos/core-auth';
// Código interno não acessível!
```

---

## 🛡️ PROTEÇÕES ADICIONAIS

### 1. Validação no Pre-commit

```javascript
// scripts/validate-package-imports.js
// Bloqueia imports diretos de arquivos internos do pacote
```

### 2. TypeScript Path Mapping

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@photos/core-auth": ["./packages/core-auth/src/index.ts"],
      "@photos/core-auth/*": [] // Bloqueia imports internos
    }
  }
}
```

### 3. Documentação da API

```markdown
# packages/@photos/core-auth/README.md

## API Pública

### authService
- `signInWithGoogle(forceConsent?: boolean)`
- `signOut()`
- `getSession()`

### useSupabaseSession
- Hook para obter sessão do Supabase

## ⚠️ NÃO IMPORTE ARQUIVOS INTERNOS!
```

---

## 📊 COMPARAÇÃO FINAL

| Aspecto | Monólito Atual | Pacote NPM | Microserviço |
|--------|---------------|------------|--------------|
| **Isolamento** | ❌ Baixo | ✅ Alto | ✅✅ Máximo |
| **Performance** | ✅✅ Máxima | ✅✅ Máxima | ❌ Latência |
| **Complexidade** | ✅ Baixa | ✅ Média | ❌ Alta |
| **Proteção** | ⚠️ Média | ✅ Alta | ✅✅ Máxima |
| **Manutenção** | ✅ Fácil | ✅ Fácil | ❌ Difícil |
| **Custo** | ✅ Baixo | ✅ Baixo | ❌ Alto |
| **Escalabilidade** | ⚠️ Limitada | ⚠️ Limitada | ✅✅ Alta |

---

## 🎯 RECOMENDAÇÃO FINAL

**✅ IMPLEMENTAR: Pacote NPM Interno**

**Benefícios:**
- ✅ Isolamento de código crítico
- ✅ API pública clara
- ✅ Zero latência
- ✅ Fácil de manter
- ✅ Proteção contra alterações acidentais
- ✅ Pode evoluir para microserviço depois

**Próximo passo:**
Posso implementar isso agora se você quiser!
