# Solução para Sessão Inválida e Token Expirado

## 🔴 Problema Identificado

Os logs do Supabase mostram:
1. **"session id doesn't exist"** - A sessão do Supabase está inválida/expirada
2. **"400: Invalid Refresh Token: Refresh Token Not Found"** - O token de refresh do Google está inválido

Isso causa:
- ❌ Navbar não aparece (sem sessão válida)
- ❌ Google Picker não funciona (sem token válido)
- ❌ Não consegue acessar Google Drive

## ✅ Correções Aplicadas

### 1. Melhor Tratamento de Sessão Inválida
- `authService.getSession()` agora detecta e limpa sessões inválidas
- Tenta refresh automático quando a sessão está expirando
- Limpa cookies quando detecta sessão inválida

### 2. Limpeza de Tokens Inválidos
- Quando o refresh token do Google está inválido, ele é removido do banco
- O sistema detecta e limpa automaticamente

### 3. Redirecionamento Automático
- Quando detecta sessão inválida em rotas protegidas, redireciona para login
- Mostra mensagem de erro apropriada na página de login

### 4. Mensagens de Erro na Página de Login
- Mostra mensagem quando `?error=session_expired`
- Mostra mensagem quando `?error=session_error`
- Mostra mensagem quando `?error=auth_failed`

## 🚀 Solução Imediata

### Para o Usuário:

1. **Faça logout e login novamente:**
   - Acesse `/auth/logout` ou clique em sair
   - Faça login novamente com Google
   - Isso vai gerar uma nova sessão e um novo refresh token

2. **Limpe cookies e cache:**
   - No navegador, pressione Ctrl+Shift+Delete
   - Limpe cookies e cache
   - Recarregue a página

3. **Verifique se está logado:**
   - Abra o console (F12)
   - Procure por logs `[AuthContext]`
   - Verifique se há sessão válida

### Para o Desenvolvedor:

1. **Verifique os logs do Supabase:**
   - Se aparecer "Invalid Refresh Token", o usuário precisa fazer login novamente
   - Se aparecer "session id doesn't exist", a sessão expirou

2. **Verifique o banco de dados:**
   ```sql
   -- Verifica se há refresh_token válido
   SELECT id, email, google_refresh_token IS NOT NULL as has_token
   FROM tb_profiles
   WHERE id = 'USER_ID_AQUI';
   ```

3. **Force logout do usuário:**
   - Se necessário, limpe manualmente os tokens do banco:
   ```sql
   UPDATE tb_profiles
   SET google_refresh_token = NULL,
       google_access_token = NULL,
       google_token_expires_at = NULL
   WHERE id = 'USER_ID_AQUI';
   ```

## 🔍 Como Verificar se Está Funcionando

1. **Abra o console do navegador (F12)**
2. **Procure por logs:**
   - `[AuthContext] Inicializando autenticação...`
   - `[AuthContext] Sessão inicial:` - deve mostrar `hasSession: true`
   - `[AuthContext] Usuário definido:` - deve mostrar os dados do usuário
   - `[Navbar] Debug:` - deve mostrar `shouldShow: true`

3. **Se aparecer:**
   - `[AuthContext] Nenhuma sessão encontrada` → Faça login novamente
   - `[AuthContext] Erro ao buscar sessão` → Verifique cookies
   - `[AuthContext] Redirecionando para login...` → Sessão inválida detectada

## 📋 Checklist de Verificação

- [ ] Fez logout e login novamente
- [ ] Limpou cookies e cache
- [ ] Verificou logs no console
- [ ] Verificou se há refresh_token no banco
- [ ] Verificou se a navbar aparece após login
- [ ] Verificou se o Google Picker funciona

## 🎯 Próximos Passos

Após fazer login novamente:
1. A navbar deve aparecer automaticamente
2. O Google Picker deve funcionar
3. Você deve conseguir acessar o Google Drive

Se o problema persistir após fazer login novamente, verifique:
- Se o `google_refresh_token` está sendo salvo no banco após o login
- Se há erros no console do navegador
- Se há erros nos logs da Vercel
