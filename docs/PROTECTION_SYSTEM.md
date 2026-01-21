# 🛡️ SISTEMA DE PROTEÇÃO DE CÓDIGOS CRÍTICOS

## ⚠️ AVISO CRÍTICO

**ESTE SISTEMA PROTEGE ARQUIVOS ESSENCIAIS PARA A SEGURANÇA DA APLICAÇÃO.**

**ALTERAÇÕES NESTES ARQUIVOS PODEM:**
- Quebrar toda a autenticação
- Expor dados sensíveis
- Permitir acesso não autorizado
- Comprometer a segurança do sistema

---

## 📋 ARQUIVOS PROTEGIDOS

### 🔴 NÍVEL MÁXIMO - BLOQUEIO TOTAL

Estes arquivos **NÃO PODEM** ser alterados sem:
1. ✅ Aprovação explícita via flag `--allow-critical-changes`
2. ✅ Testes passando 100%
3. ✅ Revisão de código obrigatória
4. ✅ Documentação atualizada

#### Autenticação e Autorização
- `src/middleware.ts` - Proteção de rotas
- `src/app/api/auth/callback/route.ts` - Callback OAuth
- `src/app/api/auth/google/route.ts` - Login Google
- `src/app/api/auth/logout/route.ts` - Logout
- `src/core/services/auth.service.ts` - Serviço de autenticação
- `src/core/logic/auth-gallery.ts` - Autenticação de galerias
- `src/contexts/AuthContext.tsx` - Contexto de autenticação
- `src/hooks/useSupabaseSession.ts` - Hook de sessão
- `src/lib/supabase.client.ts` - Cliente Supabase (browser)
- `src/lib/supabase.server.ts` - Cliente Supabase (server)

#### Google Drive API
- `src/core/services/google.service.ts` - Serviço Google (tokens)
- `src/core/services/google-drive.service.ts` - Serviço Google Drive
- `src/lib/google-auth.ts` - Autenticação Google
- `src/actions/google.actions.ts` - Server actions Google
- `src/core/utils/google-oauth-throttle.ts` - Rate limiting

#### Tokens e Segurança
- `src/core/services/token-cleanup.service.ts` - Limpeza de tokens

---

## 🚫 COMO O SISTEMA BLOQUEIA ALTERAÇÕES

### 1. Pre-commit Hook (Git)
- Detecta alterações em arquivos protegidos
- **BLOQUEIA** commit se não houver flag `--allow-critical-changes`
- Exige confirmação explícita

### 2. Script de Validação
- `scripts/validate-critical-files.sh` - Valida antes de commit
- `scripts/protect-critical-files.js` - Validação Node.js

### 3. CI/CD Pipeline
- Testes obrigatórios para arquivos críticos
- Bloqueia merge se testes falharem
- Exige aprovação de 2 revisores

---

## ✅ COMO FAZER ALTERAÇÕES PERMITIDAS

### Opção 1: Flag Explícita (Recomendado)
```bash
# Adiciona flag especial ao commit
git commit -m "fix: corrige bug crítico" --allow-critical-changes

# Ou via variável de ambiente
ALLOW_CRITICAL_CHANGES=true git commit -m "fix: corrige bug crítico"
```

### Opção 2: Bypass Temporário (Apenas Emergências)
```bash
# ⚠️ USE APENAS EM EMERGÊNCIAS
SKIP_PROTECTION=true git commit -m "fix: emergência crítica"
```

### Opção 3: Adicionar ao Arquivo de Exceções
```bash
# Edite .critical-files-exceptions.json
# Adicione o arquivo com justificativa
```

---

## 📝 CHECKLIST OBRIGATÓRIO ANTES DE ALTERAR

- [ ] Li e entendi `CRITICAL_AUTH_FILES.md`
- [ ] Li e entendi `AUTH_CONTRACT.md`
- [ ] Entendi o impacto da mudança
- [ ] Criei/atualizei testes unitários
- [ ] Todos os testes passam (100%)
- [ ] Testei localmente extensivamente
- [ ] Atualizei documentação
- [ ] Solicitei revisão de código
- [ ] Documentei a mudança no commit
- [ ] Usei flag `--allow-critical-changes`

---

## 🔧 CONFIGURAÇÃO DO SISTEMA

### Instalar Proteção
```bash
# Instala hooks do git
npm run setup:protection

# Ou manualmente
chmod +x scripts/validate-critical-files.sh
chmod +x scripts/protect-critical-files.js
```

### Verificar Status
```bash
# Verifica quais arquivos estão protegidos
npm run check:protection

# Lista arquivos críticos
npm run list:critical
```

### Desabilitar Temporariamente (NÃO RECOMENDADO)
```bash
# ⚠️ APENAS PARA DESENVOLVIMENTO LOCAL
# Edite .husky/pre-commit e comente a validação
```

---

## 🚨 O QUE FAZER SE ALGO QUEBRAR

1. **NÃO FAÇA COMMIT** se testes falharem
2. **REVERTA** mudanças imediatamente
3. **COMUNIQUE** a equipe
4. **DOCUMENTE** o problema
5. **ATUALIZE** testes para prevenir recorrência

---

## 📚 ESTRUTURA DE SERVIÇOS ENCAPSULADOS

Os serviços críticos estão encapsulados em:
- `src/core/services/` - Serviços principais
- `src/core/logic/` - Lógica de negócio crítica
- `src/lib/` - Bibliotecas e clientes

**NÃO ALTERE DIRETAMENTE:**
- Use apenas as funções exportadas
- Não modifique implementação interna
- Use apenas APIs públicas documentadas

---

## 🔐 SEGURANÇA ADICIONAL

### Validação de Integridade
- Hash dos arquivos críticos são validados
- Mudanças não autorizadas são detectadas
- Logs de todas as alterações

### Monitoramento
- Alertas quando arquivos críticos são alterados
- Notificações para equipe
- Histórico de mudanças

---

## 📞 SUPORTE

Se precisar fazer alterações críticas:
1. Abra uma issue explicando o motivo
2. Solicite aprovação da equipe
3. Siga o checklist completo
4. Documente tudo

**LEMBRE-SE: SEGURANÇA É PRIORIDADE MÁXIMA!**
