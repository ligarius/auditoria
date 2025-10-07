#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_CMD="${COMPOSE_CMD:-$ROOT_DIR/scripts/compose.sh}"
USE_DOCKER="${ACCEPT_USE_DOCKER:-1}"
WAIT_SCRIPT="$ROOT_DIR/scripts/wait-on.sh"
HEALTH_URL="${ACCEPT_HEALTH_URL:-http://localhost:4000/health}"
WAIT_TIMEOUT="${ACCEPT_HEALTH_TIMEOUT:-180}"
WAIT_INTERVAL="${ACCEPT_HEALTH_INTERVAL:-3}"
PDF_CHECK_URL="${ACCEPT_PDF_CHECK_URL:-http://localhost:4000/api/debug/pdf-check}"

TMP_FILES=()

cleanup() {
  for tmp in "${TMP_FILES[@]}"; do
    if [[ -n "$tmp" && -f "$tmp" ]]; then
      rm -f "$tmp"
    fi
  done
}

trap cleanup EXIT

info() {
  printf '\n[accept] %s\n' "$*"
}

run_in_dir() {
  local dir="$1"
  shift
  (cd "$dir" && "$@")
}

run_api() {
  if [[ "$USE_DOCKER" == "1" ]]; then
    if [[ ! -x "$COMPOSE_CMD" ]]; then
      echo "Docker compose helper not found at $COMPOSE_CMD" >&2
      exit 1
    fi
    "$COMPOSE_CMD" exec -T api "$@"
  else
    run_in_dir "$ROOT_DIR/api" "$@"
  fi
}

if [[ ! -x "$WAIT_SCRIPT" ]]; then
  echo "Helper $WAIT_SCRIPT must be executable" >&2
  exit 1
fi

info "Linting API"
run_in_dir "$ROOT_DIR/api" npm run lint

info "Type-checking API"
run_in_dir "$ROOT_DIR/api" npx tsc --noEmit

info "Linting Web"
run_in_dir "$ROOT_DIR/web" npm run lint

info "Type-checking Web"
run_in_dir "$ROOT_DIR/web" npx tsc --noEmit

echo
echo "[accept] Syncing schema (no migrations)"
run_api npm run db:push

echo
echo "[accept] Seeding (if available)"
run_api npm run db:seed || true

info "Waiting for API health at $HEALTH_URL"
"$WAIT_SCRIPT" "$HEALTH_URL" "$WAIT_TIMEOUT" "$WAIT_INTERVAL"

info "Building web application"
run_in_dir "$ROOT_DIR/web" npm run build

strict_health_tmp="$(mktemp)"
TMP_FILES+=("$strict_health_tmp")

info "Running strict API health verification"
attempt=1
max_attempts=20
while (( attempt <= max_attempts )); do
  status_code=$(curl -sS -o "$strict_health_tmp" -w "%{http_code}" "$HEALTH_URL" || true)
  if [[ "$status_code" == "200" ]] && grep -q '"ok":true' "$strict_health_tmp"; then
    break
  fi
  if (( attempt == max_attempts )); then
    echo "❌ API health check falló" >&2
    exit 1
  fi
  sleep 1
  ((attempt++))
done

pdf_target="/tmp/accept-pdf-check.pdf"
TMP_FILES+=("$pdf_target")

info "Validating PDF diagnostic output"
curl -sS "$PDF_CHECK_URL" -o "$pdf_target"
if ! file "$pdf_target" | grep -E "PDF document, version 1\\." > /dev/null; then
  echo "❌ PDF check no es un archivo PDF válido" >&2
  exit 1
fi
if ! head -c 5 "$pdf_target" | grep -q "^%PDF-"; then
  echo "❌ PDF check no contiene la firma %PDF-" >&2
  exit 1
fi

info "Acceptance workflow completed"
echo "✅ Acceptance checks passed (health + PDF)."
