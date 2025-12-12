#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------
# Supabase local Auth (GoTrue) setup helper
# - Loads .env
# - Sets NO_PROXY for localhost
# - Restarts Supabase services
# - Verifies Google provider status
# -----------------------------------------------

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
command -v supabase >/dev/null 2>&1 || { echo -e "${RED}Erro:${NC} 'supabase' CLI não encontrado. Instale com: 'npm i -g supabase' ou consulte a doc.${NC}"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}Erro:${NC} 'curl' não encontrado."; exit 1; }

# Locate .env
ENV_FILE="supabase/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat << 'EOF'
# ==============================
# Arquivo .env não encontrado.
# Crie um .env com, por exemplo:
# ------------------------------
# SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=true
# SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID
# SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=SEU_GOOGLE_CLIENT_SECRET
# SUPABASE_AUTH_SITE_URL=http://localhost:3000
# SUPABASE_AUTH_REDIRECT_URI_ALLOW_LIST=http://localhost:54321/auth/v1/callback,http://localhost:3000/*
# ==============================
EOF
  exit 1
fi

# Load .env (ignoring comments and empty lines)
echo -e "${BLUE}Carregando variáveis do .env...${NC}"
# shellcheck disable=SC2046
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Set NO_PROXY to bypass corporate proxies for local addresses
export NO_PROXY="localhost,127.0.0.1,::1,*.local,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16"
export no_proxy="$NO_PROXY"

# Basic validation
missing=()
[[ "${SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED:-}" != "true" ]] && missing+=("SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=true")
[[ -z "${SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID:-}" ]] && missing+=("SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client_id>")
[[ -z "${SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET:-}" ]] && missing+=("SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<secret>")
[[ -z "${SUPABASE_AUTH_SITE_URL:-}" ]] && missing+=("SUPABASE_AUTH_SITE_URL=http://localhost:3000")
[[ -z "${SUPABASE_AUTH_REDIRECT_URI_ALLOW_LIST:-}" ]] && missing+=("SUPABASE_AUTH_REDIRECT_URI_ALLOW_LIST=http://localhost:54321/auth/v1/callback,http://localhost:3000/*")

if (( ${#missing[@]} > 0 )); then
  echo -e "${YELLOW}Atenção:${NC} variáveis essenciais faltando/indevidas:";
  for v in "${missing[@]}"; do echo " - $v"; done
  echo -e "Edite o arquivo .env e execute novamente.";
  exit 1
fi

# Restart Supabase services
echo -e "${BLUE}Reiniciando serviços Supabase...${NC}"
supabase stop || true
supabase start -x edge-runtime -x edgeRuntime

# Verify health via Kong gateway (54321)
AUTH_HEALTH=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54321/auth/v1/health)
if [[ "$AUTH_HEALTH" != "200" ]]; then
  echo -e "${RED}Falha:${NC} Auth não respondeu 200 em /auth/v1/health (HTTP $AUTH_HEALTH)."
  exit 1
fi

# Show current settings
echo -e "${BLUE}Consultando /auth/v1/settings...${NC}"
SETTINGS_JSON=$(curl --noproxy localhost,127.0.0.1 -s http://127.0.0.1:54321/auth/v1/settings)

# Print JSON and a friendly status
echo "$SETTINGS_JSON" | sed 's/","/"\n"/g'

# Quick check for google enabled
if echo "$SETTINGS_JSON" | grep -q '"google":true'; then
  echo -e "${GREEN}OK:${NC} Provider Google habilitado (settings reporta google=true)."
else
  echo -e "${YELLOW}Aviso:${NC} Provider Google ainda aparece desabilitado nas settings.\n"
  echo "Possíveis causas:"
  echo " - Containers não recarregaram a config (tente novamente: supabase stop && supabase start)"
  echo " - Versão do Studio desatualizada (faça: supabase update)"
  echo " - Cache do navegador (abra em janela anônima)"
fi

# Final hints
cat << 'EOF'
-----------------------------------------------
Dicas:
- Abra o Studio: http://localhost:54323
- Teste OAuth do Google:
  http://localhost:54321/auth/v1/authorize?provider=google
- Se usar front-end:
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:3000' } })
-----------------------------------------------
EOF
