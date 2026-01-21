# 📜 CONTRATO DE AUTENTICAÇÃO

Este documento define o **comportamento esperado** do sistema de autenticação. Qualquer mudança que viole este contrato **DEVE** ser documentada e aprovada.

---

## 🔐 Contratos Principais

### 1. `authService.getSession()`

**Comportamento Esperado:**
- ✅ Retorna `Session | null`
- ✅ Se houver erro, limpa a sessão e retorna `null`
- ✅ Se sessão expirando (< 5min), tenta refresh automaticamente
- ✅ Se refresh falhar, limpa sessão e retorna `null`
- ✅ Nunca retorna sessão inválida

**Garantias:**
- Sempre limpa sessão inválida
- Sempre tenta refresh antes de expirar
- Nunca expõe sessão corrompida

---

### 2. `middleware.ts` - Proteção de Rotas

**Comportamento Esperado:**
- ✅ `/dashboard` e `/onboarding` requerem autenticação
- ✅ Se não autenticado, redireciona para `/`
- ✅ Preserva cookies durante redirecionamento
- ✅ Funciona em subdomínios e domínio principal
- ✅ Não bloqueia rotas públicas

**Garantias:**
- Rotas protegidas sempre verificam autenticação
- Redirecionamento sempre preserva estado
- Nunca permite acesso não autorizado

---

### 3. `api/auth/callback/route.ts` - OAuth Callback

**Comportamento Esperado:**
- ✅ Recebe `code` do Google OAuth
- ✅ Troca `code` por sessão Supabase
- ✅ Salva `provider_refresh_token` (Google) no banco
- ✅ Salva `provider_token` (Google) no banco
- ✅ Valida formato do refresh token antes de salvar
- ✅ Redireciona para `/dashboard` após sucesso
- ✅ Redireciona para `/login?error=auth_failed` se falhar

**Garantias:**
- Sempre valida tokens antes de salvar
- Nunca salva tokens inválidos
- Sempre redireciona após processamento
- Sempre trata erros adequadamente

---

### 4. `useSupabaseSession.getAuthDetails()`

**Comportamento Esperado:**
- ✅ Retorna `{ accessToken: string | null, userId: string | null }`
- ✅ Tenta múltiplas fontes para obter userId (sessionData → AuthContext → Supabase)
- ✅ Usa AuthContext como fallback quando Supabase falha
- ✅ Busca token do Google via server action
- ✅ Retorna `null` para accessToken se não disponível (sistema usa API Key)
- ✅ Timeout de 2s para busca direta, 3s para fallback

**Garantias:**
- Sempre tenta AuthContext antes de Supabase (evita timeout)
- Sempre retorna userId se disponível em qualquer fonte
- Nunca trava indefinidamente (timeouts configurados)

---

### 5. Cookies e Domínios

**Comportamento Esperado:**
- ✅ Cookies de autenticação usam `NEXT_PUBLIC_COOKIE_DOMAIN`
- ✅ Em produção: `.suagaleria.com.br` (permite subdomínios)
- ✅ Em localhost: sem domain (host-only)
- ✅ Cookies sempre `httpOnly: true` para tokens
- ✅ Cookies sempre `secure: true` em produção

**Garantias:**
- Cookies sempre configurados corretamente
- Sempre funcionam em subdomínios
- Nunca expõem tokens via JavaScript

---

## 🧪 Validações de Teste

Cada arquivo crítico deve ter testes que validam:

1. ✅ Comportamento de sucesso
2. ✅ Tratamento de erros
3. ✅ Edge cases
4. ✅ Timeouts e race conditions
5. ✅ Validação de tokens
6. ✅ Limpeza de sessão inválida

---

## ⚠️ Mudanças que Quebram o Contrato

Se você precisa fazer uma mudança que quebra este contrato:

1. **Documente** a mudança e o motivo
2. **Atualize** este contrato
3. **Atualize** todos os testes
4. **Comunique** a equipe
5. **Obtenha** aprovação antes de merge

---

## 📝 Histórico de Mudanças

| Data | Arquivo | Mudança | Aprovado Por |
|------|---------|---------|--------------|
| - | - | Contrato inicial | - |
