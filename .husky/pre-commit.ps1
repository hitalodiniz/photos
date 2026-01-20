# 🔒 PROTEÇÃO DE ARQUIVOS CRÍTICOS DE AUTENTICAÇÃO (PowerShell)
# Versão alternativa para Windows PowerShell
# Use este arquivo se o hook shell não funcionar bem no seu ambiente

$CRITICAL_FILES = @(
  "src/middleware.ts",
  "src/app/api/auth/callback/route.ts",
  "src/core/services/auth.service.ts",
  "src/hooks/useSupabaseSession.ts",
  "src/contexts/AuthContext.tsx",
  "src/lib/supabase.client.ts",
  "src/lib/supabase.server.ts",
  "src/app/api/auth/google/route.ts",
  "src/core/services/google.service.ts",
  "src/core/logic/auth-gallery.ts"
)

# Verifica se algum arquivo crítico foi modificado
$stagedFiles = git diff --cached --name-only
$CHANGED_CRITICAL_FILES = @()

foreach ($file in $CRITICAL_FILES) {
  if ($stagedFiles -contains $file) {
    $CHANGED_CRITICAL_FILES += $file
  }
}

# Se há arquivos críticos modificados, exige confirmação
if ($CHANGED_CRITICAL_FILES.Count -gt 0) {
  Write-Host ""
  Write-Host "⚠️  ⚠️  ⚠️  ATENÇÃO: ARQUIVOS CRÍTICOS DE AUTENTICAÇÃO MODIFICADOS ⚠️  ⚠️  ⚠️" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Os seguintes arquivos críticos foram modificados:"
  foreach ($file in $CHANGED_CRITICAL_FILES) {
    Write-Host "  🔴 $file" -ForegroundColor Red
  }
  Write-Host ""
  Write-Host "📋 Checklist obrigatório antes de commitar:"
  Write-Host "  [ ] Li CRITICAL_AUTH_FILES.md"
  Write-Host "  [ ] Entendi o impacto da mudança"
  Write-Host "  [ ] Criei/atualizei testes unitários"
  Write-Host "  [ ] Testei localmente"
  Write-Host "  [ ] Atualizei documentação se necessário"
  Write-Host "  [ ] Solicitei revisão de código"
  Write-Host ""
  Write-Host "⚠️  Estas mudanças podem afetar a segurança da aplicação!" -ForegroundColor Yellow
  Write-Host ""
  
  $confirmation = Read-Host "Confirma que você seguiu o checklist? (digite 'SIM' para continuar)"
  
  if ($confirmation -ne "SIM") {
    Write-Host ""
    Write-Host "❌ Commit cancelado. Por favor, revise o checklist antes de continuar." -ForegroundColor Red
    Write-Host "📖 Consulte CRITICAL_AUTH_FILES.md para mais informações."
    exit 1
  }
  
  Write-Host ""
  Write-Host "✅ Confirmação recebida. Continuando com o commit..." -ForegroundColor Green
  Write-Host ""
}

# Executa testes
Write-Host "🧪 Executando testes..."
npm test
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "❌ Testes falharam! Commit cancelado." -ForegroundColor Red
  Write-Host "⚠️  Por favor, corrija os testes antes de commitar."
  exit 1
}

# Executa build
Write-Host "🔨 Executando build..."
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "❌ Build falhou! Commit cancelado." -ForegroundColor Red
  Write-Host "⚠️  Por favor, corrija os erros de build antes de commitar."
  exit 1
}

Write-Host ""
Write-Host "✅ Todos os checks passaram. Commit permitido." -ForegroundColor Green
exit 0
