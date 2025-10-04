#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_CMD="${COMPOSE_CMD:-$ROOT_DIR/scripts/compose.sh}"
USE_DOCKER="${ACCEPT_USE_DOCKER:-1}"
WAIT_SCRIPT="$ROOT_DIR/scripts/wait-on.sh"
HEALTH_URL="${ACCEPT_HEALTH_URL:-http://localhost:4000/health}"
WAIT_TIMEOUT="${ACCEPT_HEALTH_TIMEOUT:-180}"
WAIT_INTERVAL="${ACCEPT_HEALTH_INTERVAL:-3}"
PDF_CHECK_URL="${ACCEPT_PDF_CHECK_URL:-http://localhost:4000/api/debug/pdf-check}"

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

info "Running database migrations"
run_api npm run migrate:deploy

info "Seeding database"
run_api npm run seed

info "Waiting for API health at $HEALTH_URL"
"$WAIT_SCRIPT" "$HEALTH_URL" "$WAIT_TIMEOUT" "$WAIT_INTERVAL"

info "Fetching API health"
curl --fail --show-error --silent "$HEALTH_URL"

info "Checking PDF generation at $PDF_CHECK_URL"
pdf_check_response="$(curl --fail --show-error --silent "$PDF_CHECK_URL")"
if ! grep -q '"pdfByteLength":[1-9]' <<<"$pdf_check_response"; then
  echo "PDF check did not return a valid payload" >&2
  echo "$pdf_check_response" >&2
  exit 1
fi

info "Building web application"
run_in_dir "$ROOT_DIR/web" npm run build

info "Acceptance workflow completed"
