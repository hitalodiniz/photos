# 🎯 Como Usar o Pre-commit Hook

## ✅ O Hook Está Funcionando!

Quando você vê esta mensagem:
```
⚠️  ⚠️  ⚠️  ATENÇÃO: ARQUIVOS CRÍTICOS DE AUTENTICAÇÃO MODIFICADOS ⚠️  ⚠️  ⚠️
```

**Isso significa que o sistema de proteção está funcionando!** 🎉

---

## 📋 O Que Fazer Quando o Hook Pedir Confirmação

### 1. Leia a Lista de Arquivos
O hook mostra quais arquivos críticos foram modificados:
```
Os seguintes arquivos críticos foram modificados:
  🔴 src/middleware.ts
  🔴 src/contexts/AuthContext.tsx
  ...
```

### 2. Revise o Checklist
Certifique-se de ter seguido:
- [ ] Li `CRITICAL_AUTH_FILES.md`
- [ ] Entendi o impacto da mudança
- [ ] Criei/atualizei testes unitários
- [ ] Testei localmente
- [ ] Atualizei documentação se necessário
- [ ] Solicitei revisão de código

### 3. Digite 'SIM' para Continuar
Quando solicitado:
```
Confirma que você seguiu o checklist? (digite 'SIM' para continuar): 
```

**Digite exatamente:** `SIM` (maiúsculas)

### 4. Aguarde os Testes
O hook vai executar:
- ✅ Testes unitários (`npm test`)
- ✅ Build (`npm run build`)

Se tudo passar, o commit será permitido.

---

## 🚨 Se Você Cancelar

Se você **não** digitar `SIM` ou digitar algo diferente:
- ❌ O commit será **cancelado**
- ✅ Você pode revisar o checklist
- ✅ Tente novamente quando estiver pronto

**Isso é intencional!** O hook protege você de commitar mudanças críticas sem revisão.

---

## 🔄 Fluxo Completo

```bash
# 1. Você faz mudanças em arquivo crítico
git add src/middleware.ts

# 2. Tenta commitar
git commit -m "feat: mudança no middleware"

# 3. Hook detecta e pede confirmação
⚠️  ATENÇÃO: ARQUIVOS CRÍTICOS MODIFICADOS
Confirma que você seguiu o checklist? (digite 'SIM'): 

# 4. Você digita 'SIM'
SIM

# 5. Hook executa testes
🧪 Executando testes...
✅ Testes passaram

# 6. Hook executa build
🔨 Executando build...
✅ Build passou

# 7. Commit permitido
✅ Todos os checks passaram. Commit permitido.
```

---

## ⚠️ Sobre o Aviso do Husky

Se você ver:
```
husky - DEPRECATED
Please remove the following two lines...
```

**Isso é apenas um aviso informativo!**
- ✅ O hook **funciona perfeitamente** com essas linhas
- ✅ É apenas um aviso sobre versões futuras (v10)
- ✅ Você pode ignorar por enquanto

Veja `HUSKY_WARNING.md` para mais detalhes.

---

## 🆘 Problemas Comuns

### "O hook não está rodando"
- Verifique se o Husky está instalado: `npm run prepare`
- Verifique se o arquivo `.husky/pre-commit` existe
- Tente: `git config core.hooksPath` (deve apontar para `.husky`)

### "Testes estão falhando"
- Corrija os testes antes de commitar
- Ou use `git commit --no-verify` (NÃO RECOMENDADO para arquivos críticos!)

### "Build está falhando"
- Corrija os erros de build
- Verifique se todas as dependências estão instaladas

---

## 💡 Dica

Se você **realmente** precisa fazer uma mudança urgente e não pode seguir o checklist completo:
1. Documente no commit message por que é urgente
2. Crie uma issue para revisão posterior
3. Use `git commit --no-verify` apenas em emergências
4. **Sempre** faça revisão depois

Mas lembre-se: **Segurança não é opcional!** 🔒
