# Sistema de Versionamento Automático

## 📋 Visão Geral

Este sistema captura automaticamente informações do Git a cada build e exibe no dashboard do admin para verificar se o deploy está atualizado.

## 🔧 Como Funciona

### 1. Script de Geração (`scripts/generate-version-env.js`)
- Executa automaticamente antes de cada `npm run dev` ou `npm run build`
- Captura informações do Git:
  - Hash do commit (7 caracteres)
  - Data do commit
  - Branch atual
  - Número de commits
  - Mensagem do último commit
  - Versão do package.json
- Gera arquivo `.env.local` com variáveis `NEXT_PUBLIC_*`

### 2. Componente de Versão (`src/components/dashboard/VersionInfo.tsx`)
- Exibe no aside do dashboard (no final)
- Mostra informações quando o sidebar está expandido:
  - Versão (v0.1.0)
  - Hash do commit
  - Branch
  - Data do deploy
  - Hora do build
- Quando colapsado, mostra tooltip com todas as informações

## 📍 Onde Aparece

O controle de versão aparece no **aside do dashboard**, bem no final, após a seção Admin Mode.

## ✅ Verificação de Deploy

Para verificar se sua aplicação está atualizada no servidor:

1. Faça um commit e push para o GitHub
2. Aguarde o deploy (Vercel/outro servidor)
3. Acesse o dashboard
4. Verifique no aside se:
   - O hash do commit corresponde ao último commit
   - A data do deploy é recente
   - A branch está correta

## 🚀 Uso

### Desenvolvimento Local
```bash
npm run dev
# O script gera automaticamente as variáveis de versão
```

### Build para Produção
```bash
npm run build
# O script gera automaticamente as variáveis de versão antes do build
```

### Verificar Versão Atual
1. Acesse `/dashboard`
2. Role até o final do aside (sidebar)
3. Veja as informações de versão

## 📝 Variáveis de Ambiente Geradas

O script cria as seguintes variáveis no `.env.local`:

- `NEXT_PUBLIC_APP_VERSION` - Versão do package.json
- `NEXT_PUBLIC_COMMIT_HASH` - Hash do commit (7 caracteres)
- `NEXT_PUBLIC_COMMIT_DATE` - Data do commit (ISO format)
- `NEXT_PUBLIC_COMMIT_COUNT` - Número total de commits
- `NEXT_PUBLIC_BRANCH` - Branch atual
- `NEXT_PUBLIC_COMMIT_MESSAGE` - Mensagem do último commit
- `NEXT_PUBLIC_BUILD_TIME` - Timestamp do build

## ⚠️ Notas Importantes

- O arquivo `.env.local` é gerado automaticamente e está no `.gitignore`
- Se o Git não estiver disponível, usa valores padrão
- As variáveis são atualizadas a cada build
- No Vercel, as variáveis são geradas durante o build do deploy

## 🔄 Atualização Automática

O sistema atualiza automaticamente:
- ✅ A cada `npm run dev`
- ✅ A cada `npm run build`
- ✅ Durante o deploy no Vercel (se configurado)
