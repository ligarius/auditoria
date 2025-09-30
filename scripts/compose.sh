#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Uso: $0 [comandos de docker compose]" >&2
  echo "Ejemplo: $0 up -d" >&2
  exit 1
fi

ENV_FILE=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "Debes indicar un archivo después de --env-file" >&2
        exit 1
      fi
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  if [[ -f .env.local ]]; then
    ENV_FILE=".env.local"
  else
    ENV_FILE=".env"
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "El archivo de entorno \"$ENV_FILE\" no existe." >&2
  echo "Duplica .env.development para crear uno: cp .env.development $ENV_FILE" >&2
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" "${ARGS[@]}"
