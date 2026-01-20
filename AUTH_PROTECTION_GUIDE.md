# 🛡️ Guia de Proteção de Arquivos Críticos de Autenticação

## 📖 Visão Geral

Este guia explica como o sistema protege arquivos críticos de autenticação/autorização contra mudanças acidentais ou não revisadas.

---

## 🎯 Objetivo

Garantir que mudanças em código crítico de segurança sejam:
- ✅ **Revisadas** antes de serem commitadas
- ✅ **Testadas** extensivamente
- ✅ **Documentadas** adequadamente
- ✅ **Aprovadas** por múltiplos desenvolvedores

---

## 🔒 Mecanismos de Proteção

### 1. Pre-commit Hook (`.husky/pre-commit`)

**O que faz:**
- Detecta mudanças em arquivos críticos
- Exige confirmação explícita (`SIM`) antes de permitir commit
- Executa testes automaticamente
- Bloqueia commit se testes falharem

**Como funciona:**
```bash
# Ao tentar commitar arquivo crítico:
⚠️  ATENÇÃO: ARQUIVOS CRÍTICOS DE AUTENTICAÇÃO MODIFICADOS
Confirma que você seguiu o checklist? (digite 'SIM' para continuar):
```

**Arquivos protegidos:**
- `src/middleware.ts`
- `src/app/api/auth/callback/route.ts`
- `src/core/services/auth.service.ts`
- `src/hooks/useSupabaseSession.ts`
- `src/contexts/AuthContext.tsx`
- E mais 5 arquivos críticos (ver `CRITICAL_AUTH_FILES.md`)

---

### 2. Avisos de Criticidade nos Arquivos

**O que faz:**
- Cada arquivo crítico tem um aviso no topo
- Aviso explica impacto e checklist obrigatório
- Serve como lembrete visual ao editar

**Exemplo:**
```typescript
/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode permitir acesso não autorizado
 * ...
 */
```

---

### 3. Documentação de Criticidade

**Arquivos:**
- `CRITICAL_AUTH_FILES.md` - Lista completa de arquivos críticos
- `AUTH_CONTRACT.md` - Comportamento esperado (contrato)
- `AUTH_PROTECTION_GUIDE.md` - Este guia

**O que faz:**
- Documenta quais arquivos são críticos
- Define comportamento esperado
- Serve como referência para testes

---

### 4. Testes Unitários

**O que faz:**
- Valida comportamento esperado
- Previne regressões
- Serve como documentação viva

**Arquivos de teste:**
- `src/core/services/auth.service.spec.ts` ✅ (já existe)
- `src/hooks/useSupabaseSession.spec.ts` ✅ (criado)
- Mais testes devem ser criados conforme necessário

**Executar testes:**
```bash
npm test                    # Todos os testes
npm run test:critical       # Apenas testes de arquivos críticos
```

---

### 5. Script de Validação

**O que faz:**
- Valida que arquivos críticos têm avisos
- Pode ser usado no CI/CD
- Garante consistência

**Executar:**
```bash
npm run validate:critical
```

---

## 📋 Checklist Antes de Alterar Arquivo Crítico

Antes de fazer qualquer mudança em arquivo crítico:

- [ ] **Li `CRITICAL_AUTH_FILES.md`** - Entendi a criticidade
- [ ] **Li `AUTH_CONTRACT.md`** - Entendi o comportamento esperado
- [ ] **Entendi o impacto** - Sei o que pode quebrar
- [ ] **Criei/atualizei testes** - Testes cobrem a mudança
- [ ] **Testei localmente** - Funciona em dev
- [ ] **Atualizei documentação** - Se necessário
- [ ] **Solicitei revisão** - Outro dev vai revisar
- [ ] **Documentei no commit** - Commit explica a mudança

---

## 🚀 Fluxo de Trabalho

### Quando você precisa alterar um arquivo crítico:

1. **Leia a documentação**
   ```bash
   # Leia estes arquivos:
   cat CRITICAL_AUTH_FILES.md
   cat AUTH_CONTRACT.md
   ```

2. **Entenda o código atual**
   - Leia o arquivo completamente
   - Entenda cada função
   - Veja os testes existentes

3. **Planeje a mudança**
   - O que você quer mudar?
   - Por que precisa mudar?
   - Qual o impacto?

4. **Crie/atualize testes**
   ```bash
   # Execute testes existentes
   npm test
   
   # Adicione novos testes se necessário
   ```

5. **Faça a mudança**
   - Implemente a mudança
   - Mantenha avisos de criticidade
   - Adicione comentários se necessário

6. **Teste extensivamente**
   ```bash
   npm run dev
   # Teste manualmente
   npm test
   ```

7. **Commit com confirmação**
   ```bash
   git add .
   git commit -m "feat: descrição clara da mudança"
   # O pre-commit hook vai pedir confirmação
   # Digite 'SIM' quando solicitado
   ```

---

## 🚨 O Que Fazer Se Algo Quebrar

### Se testes falharem no pre-commit:

1. **NÃO force o commit** - Corrija os testes primeiro
2. **Analise o erro** - Entenda o que quebrou
3. **Corrija o código ou testes** - Dependendo do problema
4. **Teste novamente** - `npm test`
5. **Tente commit novamente**

### Se produção quebrar após mudança:

1. **REVERTA imediatamente**
   ```bash
   git revert <commit-hash>
   ```

2. **COMUNIQUE a equipe**
   - Explique o problema
   - Compartilhe logs

3. **DOCUMENTE o problema**
   - O que quebrou?
   - Por que quebrou?
   - Como prevenir?

4. **ATUALIZE testes**
   - Adicione teste que previne o problema
   - Garanta que não aconteça novamente

---

## 🔍 Validação Contínua

### No CI/CD (futuro):

Adicione ao seu pipeline:
```yaml
# Exemplo para GitHub Actions
- name: Validate Critical Files
  run: npm run validate:critical

- name: Run Critical Tests
  run: npm run test:critical
```

---

## 📚 Arquivos de Referência

- `CRITICAL_AUTH_FILES.md` - Lista de arquivos críticos
- `AUTH_CONTRACT.md` - Contrato de comportamento
- `AUTH_PROTECTION_GUIDE.md` - Este guia
- `.husky/pre-commit` - Hook de proteção
- `scripts/validate-critical-files.sh` - Script de validação

---

## ❓ Perguntas Frequentes

### Posso desabilitar o pre-commit hook?

**NÃO RECOMENDADO!** O hook existe para proteger você e a aplicação. Se você realmente precisa (emergência crítica), pode usar `git commit --no-verify`, mas isso deve ser exceção rara.

### E se eu só quiser fazer uma mudança pequena?

Mesmo mudanças pequenas em arquivos críticos podem ter grande impacto. Sempre siga o checklist.

### Como adicionar um novo arquivo crítico?

1. Adicione à lista em `CRITICAL_AUTH_FILES.md`
2. Adicione ao array `CRITICAL_FILES` em `.husky/pre-commit`
3. Adicione ao array em `scripts/validate-critical-files.sh`
4. Adicione aviso de criticidade no topo do arquivo
5. Crie testes unitários

### Posso separar auth em um serviço separado?

Sim! Isso pode ser uma boa ideia para isolamento. Mas mesmo assim, o código de auth continuará sendo crítico e precisará das mesmas proteções.

---

## 🎓 Boas Práticas

1. **Sempre leia antes de alterar** - Entenda o código primeiro
2. **Teste antes de commitar** - Não confie apenas no hook
3. **Documente mudanças** - Commit messages claros
4. **Peça revisão** - Duas cabeças pensam melhor que uma
5. **Mantenha testes atualizados** - Testes são sua rede de segurança

---

## 📞 Suporte

Se tiver dúvidas sobre:
- Qual arquivo é crítico? → Veja `CRITICAL_AUTH_FILES.md`
- Qual o comportamento esperado? → Veja `AUTH_CONTRACT.md`
- Como funciona a proteção? → Veja este guia

---

**Lembre-se: Segurança não é opcional. Proteger código crítico protege seus usuários! 🔒**
