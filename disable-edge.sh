
#!/usr/bin/env bash
set -euo pipefail

# ------------------------------
# Supabase Edge Runtime - Disable Script
# ------------------------------
# O que este script faz:
# 1) Garante que o Docker Engine está ativo (WSL) e não o Podman.
# 2) Remove DOCKER_HOST apontando para podman, se existir.
# 3) Cria/atualiza docker-compose.override.yml para desabilitar o Edge Runtime
#    (considera os dois nomes de serviço: edgeRuntime e edge-runtime).
# 4) Remove overrides antigos com proxy para edgeRuntime/edge-runtime.
# 5) Reinicia o stack do Supabase.
# 6) Mostra status final dos serviços.
#
# Uso:
#   chmod +x disable-edge.sh
#   ./disable-edge.sh
#
# Requisitos:
# - Rodar no diretório raiz do projeto Supabase (ex.: ~/dev/photos).
# ------------------------------

PROJECT_DIR="$(pwd)"

echo "==> Diretório do projeto: $PROJECT_DIR"

# 1) Garantir Docker Engine ativo (WSL)
echo "==> Verificando Docker Engine..."
if ! docker info >/dev/null 2>&1; then
  echo "   Docker daemon indisponível. Tentando iniciar o serviço..."
  if command -v service >/dev/null 2>&1; then
    sudo service docker start || true
  fi
fi

# 2) Remover DOCKER_HOST que aponta para Podman, se houver
echo "==> Normalizando DOCKER_HOST..."
if [ "${DOCKER_HOST:-}" = "unix:///run/user/1000/podman/podman.sock" ]; then
  unset DOCKER_HOST
fi

# Também garante uso de /var/run/docker.sock
export DOCKER_HOST="unix:///var/run/docker.sock"

# Verifica novamente
if ! docker info >/dev/null 2>&1; then
  echo "ERRO: Docker ainda não está acessível em /var/run/docker.sock."
  echo "      Verifique se o Docker Engine está instalado e rodando no WSL:"
  echo "      sudo service docker start"
  exit 1
fi
echo "   OK: Docker Engine acessível."

# 3) Criar/atualizar docker-compose.override.yml para desabilitar Edge Runtime
OVERRIDE_FILE="$PROJECT_DIR/docker-compose.override.yml"

echo "==> Criando/atualizando $OVERRIDE_FILE para desabilitar Edge Runtime..."
cat > "$OVERRIDE_FILE" <<'EOF'
version: "3.8"

services:
  # Nome usado em versões mais novas do Supabase CLI
  edgeRuntime:
    profiles: ["disabled"]

  # Nome usado em versões anteriores / alguns logs
  edge-runtime:
    profiles: ["disabled"]
EOF

echo "   OK: $OVERRIDE_FILE escrito."

# 4) Remover overrides antigos com proxy para edgeRuntime/edge-runtime (opcional/defensivo)
#    Se você tiver outros arquivos override, ajuste conforme necessário.
#    Aqui só avisamos caso contenham variáveis de proxy.
if grep -Eq 'HTTP_PROXY|HTTPS_PROXY' "$OVERRIDE_FILE"; then
  echo "==> Removendo variáveis de proxy antigas do $OVERRIDE_FILE..."
  # Reescrevemos o arquivo sem as variáveis de proxy (já feito no passo 3).
  echo "   OK: proxies removidos (arquivo sobrescrito)."
fi

# 5) Reiniciar o stack do Supabase
echo "==> Reiniciando Supabase stack..."
supabase stop || true
supabase start --debug

# 6) Mostrar status final
echo "==> Status do Supabase:"
supabase status || true

echo "==> Containers ativos (filtro dos serviços principais):"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" \
  | grep -E 'supabase|db|auth|storage|realtime|studio|postgrest|kong|vector|mailpit|logflare' || true

echo
echo "✅ Concluído. Edge Runtime desabilitado. Os serviços principais devem estar rodando."
echo "   Se algum serviço aparecer como 'unhealthy', envie os logs para eu te ajudar:"
echo "   docker logs supabase_db_photos --tail=200"
echo "   docker logs supabase_auth_photos --tail=200"
echo "   docker logs supabase_storage_photos --tail=200"
echo "   docker logs supabase_api_photos --tail=200"
