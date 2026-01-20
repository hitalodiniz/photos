# 🚀 Como Usar o Hook Agora (Versão Não-Interativa)

## ✅ Problema Resolvido!

O hook agora funciona **perfeitamente no Windows** sem precisar de input interativo.

---

## 📝 Como Funciona Agora

### 1. Você tenta commitar normalmente:
```bash
git commit -m "sua mensagem"
```

### 2. Se houver arquivos críticos modificados:
- ⚠️ O hook mostra um aviso claro
- ❌ O commit é **cancelado automaticamente**
- 📋 Você vê o checklist e instruções

### 3. Para confirmar o commit:
Use a variável de ambiente `SKIP_CRITICAL_CHECK=1`

---

## 💻 Comandos por Sistema

### **PowerShell (Windows) - RECOMENDADO**
```powershell
$env:SKIP_CRITICAL_CHECK='1'; git commit -m "feat: adiciona proteção"
```

### **Git Bash (Windows)**
```bash
SKIP_CRITICAL_CHECK=1 git commit -m "feat: adiciona proteção"
```

### **CMD (Windows)**
```cmd
set SKIP_CRITICAL_CHECK=1 && git commit -m "feat: adiciona proteção"
```

### **Linux / Mac**
```bash
SKIP_CRITICAL_CHECK=1 git commit -m "feat: adiciona proteção"
```

---

## 🎯 Exemplo Completo

```powershell
# 1. Você adiciona arquivos
git add src/middleware.ts

# 2. Tenta commitar normalmente
git commit -m "feat: atualiza middleware"

# 3. Hook detecta arquivo crítico e cancela
⚠️  ATENÇÃO: ARQUIVOS CRÍTICOS MODIFICADOS
❌ Commit cancelado por segurança.

# 4. Você confirma com variável de ambiente
$env:SKIP_CRITICAL_CHECK='1'; git commit -m "feat: atualiza middleware"

# 5. Hook executa testes e build
🧪 Executando testes...
✅ Testes passaram
🔨 Executando build...
✅ Build passou
✅ Commit permitido!
```

---

## ⚠️ Importante

- ✅ **Use `SKIP_CRITICAL_CHECK=1`** apenas quando você realmente seguiu o checklist
- ✅ O hook ainda executa **testes e build** mesmo com a confirmação
- ❌ **NÃO use `--no-verify`** a menos que seja uma emergência real
- 📖 Sempre consulte `CRITICAL_AUTH_FILES.md` antes de modificar arquivos críticos

---

## 🔄 Para Seu Commit Atual

Como você está apenas adicionando avisos de proteção (não mudanças funcionais), use:

**PowerShell:**
```powershell
$env:SKIP_CRITICAL_CHECK='1'; git commit -m "feat: adiciona proteção de arquivos críticos de autenticação"
```

O hook vai executar testes e build, e se tudo passar, o commit será permitido! ✅
