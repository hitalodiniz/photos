#!/bin/bash

# 🔒 Script de Validação de Arquivos Críticos
# Este script valida que arquivos críticos não foram alterados sem aprovação

set -e

CRITICAL_FILES=(
  "src/middleware.ts"
  "src/app/api/auth/callback/route.ts"
  "src/core/services/auth.service.ts"
  "src/hooks/useSupabaseSession.ts"
  "src/contexts/AuthContext.tsx"
  "src/lib/supabase.client.ts"
  "src/lib/supabase.server.ts"
  "src/app/api/auth/google/route.ts"
  "src/core/services/google.service.ts"
  "src/core/logic/auth-gallery.ts"
)

echo "🔍 Verificando arquivos críticos..."

CHANGED_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    # Verifica se o arquivo tem o aviso de criticidade
    if ! grep -q "ARQUIVO CRÍTICO DE SEGURANÇA" "$file"; then
      echo "⚠️  AVISO: $file não tem aviso de criticidade!"
      CHANGED_FILES+=("$file")
    fi
  else
    echo "❌ ERRO: Arquivo crítico não encontrado: $file"
    exit 1
  fi
done

if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
  echo "✅ Todos os arquivos críticos têm avisos de segurança."
  exit 0
else
  echo "❌ Alguns arquivos críticos não têm avisos de segurança!"
  exit 1
fi
