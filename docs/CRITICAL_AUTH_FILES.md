# 🔒 ARQUIVOS CRÍTICOS DE AUTENTICAÇÃO E AUTORIZAÇÃO

## ⚠️ AVISO IMPORTANTE

**ESTES ARQUIVOS SÃO CRÍTICOS PARA A SEGURANÇA DA APLICAÇÃO.**

**QUALQUER MUDANÇA DEVE SER:**
- ✅ Revisada por pelo menos 2 desenvolvedores
- ✅ Testada extensivamente (unit tests + integration tests)
- ✅ Documentada com clareza
- ✅ Aprovada antes de merge

**NÃO ALTERE ESTES ARQUIVOS SEM ENTENDER COMPLETAMENTE O IMPACTO!**

---

## 📋 Lista de Arquivos Críticos

### 🔴 NÍVEL CRÍTICO MÁXIMO (Nunca alterar sem revisão obrigatória)

1. **`src/middleware.ts`**
   - **Função:** Proteção de rotas, verificação de autenticação, redirecionamento de subdomínios
   - **Impacto:** Qualquer bug pode permitir acesso não autorizado ou quebrar toda a autenticação
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

2. **`src/app/api/auth/callback/route.ts`**
   - **Função:** Callback OAuth do Google, salvamento de tokens, criação de sessão
   - **Impacto:** Bug pode quebrar login, expor tokens, ou permitir acesso não autorizado
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

3. **`src/core/services/auth.service.ts`**
   - **Função:** Serviço central de autenticação, gerenciamento de sessão, refresh tokens
   - **Impacto:** Bug pode quebrar toda a autenticação da aplicação
   - **Testes obrigatórios:** ✅ Sim (já existe `auth.service.spec.ts`)
   - **Revisão obrigatória:** ✅ Sim

4. **`src/hooks/useSupabaseSession.ts`**
   - **Função:** Hook de sessão do Supabase, gerenciamento de estado de autenticação
   - **Impacto:** Bug pode quebrar autenticação em toda a aplicação
   - **Testes obrigatórios:** ✅ Sim (criar)
   - **Revisão obrigatória:** ✅ Sim

5. **`src/contexts/AuthContext.tsx`**
   - **Função:** Contexto global de autenticação, estado do usuário
   - **Impacto:** Bug pode quebrar autenticação em toda a aplicação
   - **Testes obrigatórios:** ✅ Sim (criar)
   - **Revisão obrigatória:** ✅ Sim

### 🟡 NÍVEL CRÍTICO ALTO (Alterar com cuidado)

6. **`src/lib/supabase.client.ts`**
   - **Função:** Cliente Supabase do browser, configuração de cookies
   - **Impacto:** Mudanças podem quebrar autenticação cross-domain
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

7. **`src/lib/supabase.server.ts`**
   - **Função:** Cliente Supabase do servidor, gerenciamento de cookies SSR
   - **Impacto:** Mudanças podem quebrar autenticação no servidor
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

8. **`src/app/api/auth/google/route.ts`**
   - **Função:** Rota de login Google OAuth
   - **Impacto:** Bug pode quebrar fluxo de login
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

9. **`src/core/services/google.service.ts`** (funções de token)
   - **Função:** Gerenciamento de tokens do Google, refresh tokens
   - **Impacto:** Bug pode quebrar acesso ao Google Drive
   - **Testes obrigatórios:** ✅ Sim
   - **Revisão obrigatória:** ✅ Sim

10. **`src/core/logic/auth-gallery.ts`**
    - **Função:** Autenticação de galerias protegidas por senha
    - **Impacto:** Bug pode permitir acesso não autorizado a galerias
    - **Testes obrigatórios:** ✅ Sim
    - **Revisão obrigatória:** ✅ Sim

---

## 🛡️ Mecanismos de Proteção

### 1. Pre-commit Hook
- Valida mudanças em arquivos críticos
- Exige confirmação explícita para alterações
- Bloqueia commit se testes falharem

### 2. Testes Unitários
- Cada arquivo crítico deve ter testes
- Testes devem cobrir casos de sucesso e erro
- Testes devem validar comportamento esperado

### 3. Documentação de Contrato
- `AUTH_CONTRACT.md` define comportamento esperado
- Mudanças devem atualizar o contrato
- Contrato serve como referência para testes

### 4. Comentários de Aviso
- Arquivos críticos têm avisos no topo
- Avisos explicam criticidade e impacto

---

## 📝 Checklist Antes de Alterar Arquivo Crítico

- [ ] Li e entendi a documentação do arquivo
- [ ] Entendi o impacto da mudança
- [ ] Criei/atualizei testes unitários
- [ ] Testei localmente extensivamente
- [ ] Atualizei documentação se necessário
- [ ] Solicitei revisão de código
- [ ] Documentei a mudança no commit

---

## 🚨 O Que Fazer Se Algo Quebrar

1. **NÃO FAÇA COMMIT** se testes falharem
2. **REVERTA** mudanças imediatamente se produção quebrar
3. **COMUNIQUE** a equipe imediatamente
4. **DOCUMENTE** o problema e a solução
5. **ATUALIZE** testes para prevenir recorrência

---

## 📚 Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OAuth 2.0 Flow](https://oauth.net/2/)
