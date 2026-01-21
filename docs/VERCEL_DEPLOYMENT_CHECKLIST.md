# Checklist de Deploy na Vercel

## 🔴 Problemas Identificados e Soluções

### 1. Google Client ID não configurado

**Problema:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` não está definido na Vercel.

**Solução:**
1. Acesse o painel da Vercel: https://vercel.com/seu-projeto/settings/environment-variables
2. Adicione as seguintes variáveis de ambiente:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-google-client-id-aqui
   GOOGLE_CLIENT_ID=seu-google-client-id-aqui
   GOOGLE_CLIENT_SECRET=seu-google-client-secret-aqui
   ```
3. **IMPORTANTE:** Marque `NEXT_PUBLIC_GOOGLE_CLIENT_ID` como disponível para **Production, Preview, e Development**
4. Faça um novo deploy após adicionar as variáveis

### 2. Navbar não aparece

**Problema:** A navbar só aparece quando:
- Usuário está autenticado (`user` existe)
- Não está carregando (`!isLoading`)
- Está em `/dashboard`, `/onboarding` ou rotas que começam com `/dashboard/`

**Verificação:**
1. Abra o console do navegador (F12)
2. Procure por logs `[Navbar] Debug:` que mostram o estado atual
3. Verifique se o usuário está realmente autenticado

**Possíveis causas:**
- Sessão expirada (faça login novamente)
- Problema com cookies (limpe o cache e cookies)
- Problema com AuthContext (verifique se está renderizando corretamente)

### 3. Google Picker não funciona

**Problema:** O Google Picker precisa de:
1. `NEXT_PUBLIC_GOOGLE_CLIENT_ID` configurado
2. Bibliotecas do Google carregadas (`gapi` e `google.picker`)
3. Token de autenticação válido

**Verificação:**
1. Abra o console do navegador (F12)
2. Procure por logs:
   - `[GoogleApiLoader] Google GSI loaded`
   - `[GoogleApiLoader] Google Picker API loaded`
   - `[GoogleApiLoader] Status:` (mostra o estado das bibliotecas)
3. Se não aparecer, as bibliotecas não estão carregando

**Solução:**
1. Verifique se `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está configurado na Vercel
2. Verifique se não há bloqueadores de script (AdBlock, etc.)
3. Verifique o console para erros de CORS ou bloqueio de scripts

### 4. Não conectado ao Google

**Problema:** O status "Conectado" no dashboard pode estar desatualizado.

**Solução:**
1. Clique no botão de refresh ao lado de "Conectado"
2. Se não funcionar, faça logout e login novamente
3. Verifique se o `google_refresh_token` está salvo no banco de dados

## 📋 Checklist de Variáveis de Ambiente na Vercel

Certifique-se de que todas estas variáveis estão configuradas:

### Obrigatórias:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ⚠️ **CRÍTICO**
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_BASE_URL`
- [ ] `JWT_GALLERY_SECRET`

### Opcionais mas recomendadas:
- [ ] `NEXT_PUBLIC_COOKIE_DOMAIN`
- [ ] `NEXT_PUBLIC_TITLE_DEFAULT`

## 🔍 Como Diagnosticar Problemas

### 1. Console do Navegador
Abra o DevTools (F12) e verifique:
- Erros em vermelho
- Logs de `[GoogleApiLoader]`
- Logs de `[Navbar] Debug:`
- Logs de `[GooglePickerButton]`

### 2. Network Tab
Verifique se os scripts do Google estão carregando:
- `https://accounts.google.com/gsi/client`
- `https://apis.google.com/js/api.js`

### 3. Application Tab
Verifique:
- Cookies (se há cookies de autenticação)
- Local Storage (se há dados salvos)
- Service Workers (se há algum bloqueando)

## 🚀 Passos para Resolver

1. **Adicione `NEXT_PUBLIC_GOOGLE_CLIENT_ID` na Vercel**
2. **Faça um novo deploy**
3. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
4. **Faça logout e login novamente**
5. **Verifique o console do navegador** para logs de diagnóstico

## 📞 Se o Problema Persistir

1. Compartilhe os logs do console do navegador
2. Compartilhe uma captura de tela do Network tab mostrando se os scripts do Google estão carregando
3. Verifique se o domínio está autorizado no Google Cloud Console para o Client ID
