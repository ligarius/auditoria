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
API_BASE_URL="${ACCEPT_API_BASE_URL:-http://localhost:4000/api}"
WEB_BASE_URL="${ACCEPT_WEB_BASE_URL:-http://localhost:8080}"

API_BASE_URL="${API_BASE_URL%/}"
PROJECTS_URL="$API_BASE_URL/projects"
LOGIN_URL="$API_BASE_URL/auth/login"
WEB_BASE_URL="${WEB_BASE_URL%/}"

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

login_tmp="$(mktemp)"
TMP_FILES+=("$login_tmp")

info "Obtaining demo access token for cache validation"
login_status=$(curl -sS -o "$login_tmp" -w "%{http_code}" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"Cambiar123!"}' \
  "$LOGIN_URL" || true)

if [[ "$login_status" != "200" ]]; then
  echo "❌ Login demo admin failed with status $login_status" >&2
  cat "$login_tmp" >&2 || true
  exit 1
fi

access_token="$(node -e "const fs=require('fs'); try { const raw=fs.readFileSync(process.argv[1], 'utf8'); if (!raw) { process.stdout.write(''); process.exit(0); } const data=JSON.parse(raw); const nested=data && data.data ? data.data : {}; const token=data && (data.accessToken || data.token) ? (data.accessToken || data.token) : (nested.accessToken || nested.token || ''); process.stdout.write(token || ''); } catch (error) { process.stdout.write(''); }" "$login_tmp")"

if [[ -z "$access_token" ]]; then
  echo "❌ Could not extract access token from login response" >&2
  cat "$login_tmp" >&2 || true
  exit 1
fi

api_headers_tmp="$(mktemp)"
TMP_FILES+=("$api_headers_tmp")

info "Validating API response headers are not cacheable"
curl -sSI -H "Authorization: Bearer $access_token" -H 'Accept: application/json' \
  "$PROJECTS_URL" > "$api_headers_tmp"

status_line=$(head -n 1 "$api_headers_tmp")
if [[ "$status_line" != *" 200 "* ]]; then
  echo "❌ Expected 200 OK for projects HEAD request, got: $status_line" >&2
  cat "$api_headers_tmp" >&2
  exit 1
fi

if grep -iq '^etag:' "$api_headers_tmp"; then
  echo "❌ ETag header still present in /api/projects response" >&2
  cat "$api_headers_tmp" >&2
  exit 1
fi

if ! grep -iq '^cache-control: *no-store' "$api_headers_tmp"; then
  echo "❌ Cache-Control no-store header missing on /api/projects" >&2
  cat "$api_headers_tmp" >&2
  exit 1
fi

if ! grep -iq '^pragma: *no-cache' "$api_headers_tmp"; then
  echo "❌ Pragma no-cache header missing on /api/projects" >&2
  cat "$api_headers_tmp" >&2
  exit 1
fi

info "Ensuring conditional requests are not answered with 304"
conditional_status_line=$(curl -sSI \
  -H "Authorization: Bearer $access_token" \
  -H 'If-None-Match: "dummy-etag"' \
  -H 'Accept: application/json' \
  "$PROJECTS_URL" | head -n 1)

if [[ "$conditional_status_line" != *" 200 "* ]]; then
  echo "❌ Conditional request returned non-200 response: $conditional_status_line" >&2
  exit 1
fi

projects_body_tmp="$(mktemp)"
TMP_FILES+=("$projects_body_tmp")

info "Fetching /api/projects JSON payload"
projects_status=$(curl -sS -o "$projects_body_tmp" -w "%{http_code}" \
  -H "Authorization: Bearer $access_token" \
  -H 'Accept: application/json' \
  "$PROJECTS_URL" || true)

if [[ "$projects_status" != "200" ]]; then
  echo "❌ Expected 200 when fetching /api/projects, got $projects_status" >&2
  cat "$projects_body_tmp" >&2 || true
  exit 1
fi

web_headers_tmp="$(mktemp)"
TMP_FILES+=("$web_headers_tmp")

info "Checking web frontend no-store headers"
curl -sSI "$WEB_BASE_URL" > "$web_headers_tmp"

web_status_line=$(head -n 1 "$web_headers_tmp")
if [[ "$web_status_line" != *" 200 "* ]]; then
  echo "❌ Expected 200 OK from frontend, got: $web_status_line" >&2
  cat "$web_headers_tmp" >&2
  exit 1
fi

if ! grep -iq '^cache-control: *no-store' "$web_headers_tmp"; then
  echo "❌ Frontend response is missing Cache-Control: no-store" >&2
  cat "$web_headers_tmp" >&2
  exit 1
fi

if ! grep -iq '^pragma: *no-cache' "$web_headers_tmp"; then
  echo "❌ Frontend response is missing Pragma: no-cache" >&2
  cat "$web_headers_tmp" >&2
  exit 1
fi


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
