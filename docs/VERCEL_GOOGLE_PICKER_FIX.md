# Fix para Google Picker no Vercel

## 🔴 Problema
O Google Picker parou de funcionar no Vercel após mudanças recentes, mas funciona no localhost.

## ✅ Checklist de Verificação

### 1. Variáveis de Ambiente na Vercel
Certifique-se de que estas variáveis estão configuradas:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id-aqui
GOOGLE_CLIENT_ID=seu-client-id-aqui (opcional, mas recomendado)
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
```

**Importante:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` é necessário para o cliente
- `GOOGLE_CLIENT_ID` é necessário para o servidor (refresh tokens)
- Ambas devem ter o mesmo valor

### 2. Verificar se o Client ID está sendo retornado
No console do navegador (F12), procure por:
- `[GooglePickerButton] Client ID não encontrado` → Variável não configurada
- `[GooglePickerButton] Token não disponível` → Problema de autenticação

### 3. Verificar se as bibliotecas estão carregando
No console, procure por:
- `[GoogleApiLoader] Google GSI loaded`
- `[GoogleApiLoader] Google Picker API loaded`
- `[GoogleApiLoader] Status:` → Deve mostrar `hasPicker: true`

### 4. Verificar logs de erro
No console, procure por erros relacionados a:
- `getGoogleClientId`
- `getAuthDetails`
- `getValidGoogleToken`

## 🔧 Solução Simplificada

Se o problema persistir, o código foi simplificado para:
1. **Sempre buscar Client ID do servidor** (via `getGoogleClientId()`)
2. **Remover redirecionamento automático** (apenas mostra erro)
3. **Melhorar logs** para diagnóstico

## 🚀 Próximos Passos

1. **Verifique as variáveis de ambiente na Vercel:**
   - Vá em Settings → Environment Variables
   - Confirme que `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está configurada
   - Confirme que `GOOGLE_CLIENT_SECRET` está configurada

2. **Faça um novo deploy:**
   - Após adicionar/atualizar variáveis, faça um novo deploy
   - As variáveis só são aplicadas em novos deploys

3. **Teste no navegador:**
   - Abra o console (F12)
   - Clique no botão "Vincular Drive"
   - Verifique os logs no console

4. **Se ainda não funcionar:**
   - Compartilhe os logs do console
   - Verifique se há erros na aba Network do DevTools

## 📝 Notas

- O código agora sempre busca o Client ID do servidor, garantindo que funcione no Vercel
- Removido o redirecionamento automático que poderia estar causando problemas
- Logs melhorados para facilitar diagnóstico
