# 🏗️ ARQUITETURA DE SERVIÇOS - CÓDIGOS CRÍTICOS

## 📦 SERVIÇOS ENCAPSULADOS

Os códigos críticos estão **encapsulados em serviços** para evitar alterações diretas e garantir segurança.

---

## 🔐 CAMADA DE AUTENTICAÇÃO

### `src/core/services/auth.service.ts`
**Serviço central de autenticação**

```typescript
// ✅ USE ASSIM (API Pública)
import { authService } from '@/core/services/auth.service';

// Login
await authService.signInWithGoogle(forceConsent?: boolean);

// Logout
await authService.signOut();

// Sessão
const session = await authService.getSession();

// ❌ NÃO ALTERE A IMPLEMENTAÇÃO INTERNA
```

**O que faz:**
- Gerencia login/logout
- Renova tokens automaticamente
- Valida sessões
- Trata erros de autenticação

**O que NÃO fazer:**
- ❌ Modificar implementação interna
- ❌ Acessar variáveis privadas
- ❌ Alterar lógica de tokens

---

## 🔑 CAMADA DE AUTORIZAÇÃO

### `src/core/logic/auth-gallery.ts`
**Autenticação de galerias protegidas**

```typescript
// ✅ USE ASSIM (API Pública)
import { authenticateGaleriaAccess } from '@/core/logic/auth-gallery';

const result = await authenticateGaleriaAccess(
  galeriaId,
  fullSlug,
  passwordInput
);

if (result.success) {
  // Acesso autorizado
}
```

**O que faz:**
- Valida senhas de galerias
- Cria cookies JWT
- Gerencia acesso a galerias privadas

**O que NÃO fazer:**
- ❌ Modificar lógica de validação
- ❌ Alterar criação de JWT
- ❌ Mudar configuração de cookies

---

## ☁️ CAMADA DO GOOGLE DRIVE

### `src/core/services/google.service.ts`
**Gerenciamento de tokens do Google**

```typescript
// ✅ USE ASSIM (API Pública)
import { getValidGoogleTokenService } from '@/core/services/google.service';

const token = await getValidGoogleTokenService(userId);
```

**O que faz:**
- Renova tokens do Google automaticamente
- Gerencia refresh tokens
- Trata rate limiting
- Valida tokens

**O que NÃO fazer:**
- ❌ Modificar lógica de renovação
- ❌ Alterar rate limiting
- ❌ Mudar validação de tokens

### `src/core/services/google-drive.service.ts`
**Acesso ao Google Drive**

```typescript
// ✅ USE ASSIM (API Pública)
import { 
  getDriveFiles,
  uploadToDrive 
} from '@/core/services/google-drive.service';
```

**O que faz:**
- Lista arquivos do Drive
- Faz upload de arquivos
- Gerencia permissões

**O que NÃO fazer:**
- ❌ Modificar chamadas à API
- ❌ Alterar tratamento de erros
- ❌ Mudar estrutura de dados

---

## 🛡️ CAMADA DE SEGURANÇA

### `src/lib/supabase.client.ts` e `src/lib/supabase.server.ts`
**Clientes Supabase (Browser e Server)**

```typescript
// ✅ USE ASSIM (API Pública)
import { supabase } from '@/lib/supabase.client';
import { createSupabaseServerClient } from '@/lib/supabase.server';

// Browser
const { data } = await supabase.from('table').select();

// Server
const supabase = await createSupabaseServerClient();
```

**O que faz:**
- Gerencia conexão com Supabase
- Configura cookies de autenticação
- Implementa PKCE flow

**O que NÃO fazer:**
- ❌ Modificar configuração de cookies
- ❌ Alterar PKCE flow
- ❌ Mudar domínio de cookies

---

## 📋 REGRAS DE USO

### ✅ FAÇA
1. Use apenas APIs públicas documentadas
2. Importe de `@/core/services/` ou `@/lib/`
3. Leia a documentação antes de usar
4. Trate erros retornados pelos serviços
5. Use TypeScript para type safety

### ❌ NÃO FAÇA
1. ❌ Modificar implementação interna
2. ❌ Acessar variáveis privadas
3. ❌ Alterar lógica de negócio crítica
4. ❌ Bypassar validações
5. ❌ Criar workarounds em vez de usar APIs

---

## 🔧 COMO ADICIONAR NOVA FUNCIONALIDADE

### 1. Identifique o Serviço Correto
- Autenticação → `auth.service.ts`
- Google Drive → `google.service.ts` ou `google-drive.service.ts`
- Galerias → `galeria.service.ts`

### 2. Use a API Pública
```typescript
// ✅ Correto
import { authService } from '@/core/services/auth.service';
await authService.signInWithGoogle();

// ❌ Errado
import { supabase } from '@/lib/supabase.client';
await supabase.auth.signInWithOAuth({ ... }); // Não faça isso!
```

### 3. Trate Erros
```typescript
try {
  const result = await authService.signInWithGoogle();
} catch (error) {
  // Trate o erro apropriadamente
  console.error('Erro de autenticação:', error);
}
```

### 4. Documente Se Necessário
Se precisar de nova funcionalidade, abra uma issue explicando o caso de uso.

---

## 🚨 SE PRECISAR ALTERAR UM SERVIÇO CRÍTICO

1. **Leia a documentação:**
   - `CRITICAL_AUTH_FILES.md`
   - `PROTECTION_SYSTEM.md`
   - `AUTH_CONTRACT.md`

2. **Siga o checklist:**
   - [ ] Entendi o impacto
   - [ ] Criei testes
   - [ ] Testei localmente
   - [ ] Solicitei revisão

3. **Use a flag especial:**
   ```bash
   git commit -m "fix: correção crítica" --allow-critical-changes
   ```

4. **Documente a mudança:**
   - Atualize documentação
   - Adicione comentários
   - Atualize testes

---

## 📚 REFERÊNCIAS

- `CRITICAL_AUTH_FILES.md` - Lista de arquivos críticos
- `PROTECTION_SYSTEM.md` - Sistema de proteção
- `AUTH_CONTRACT.md` - Contrato de autenticação
- `SERVICES_ARCHITECTURE.md` - Este arquivo

---

**LEMBRE-SE: SEGURANÇA É PRIORIDADE MÁXIMA!**
