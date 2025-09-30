#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat >&2 <<'USAGE'
Usage: scripts/wait-on.sh <url> [timeout_seconds] [interval_seconds]

Polls an HTTP endpoint until it responds successfully or the timeout is reached.
USAGE
  exit 1
fi

URL="$1"
TIMEOUT="${2:-120}"
INTERVAL="${3:-2}"

if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || ! [[ "$INTERVAL" =~ ^[0-9]+$ ]]; then
  echo "Timeout and interval must be positive integers" >&2
  exit 1
fi

end_time=$(( $(date +%s) + TIMEOUT ))

while true; do
  if curl --fail --silent --output /dev/null "$URL"; then
    exit 0
  fi

  if (( $(date +%s) >= end_time )); then
    echo "Timed out waiting for $URL after ${TIMEOUT}s" >&2
    exit 1
  fi

  sleep "$INTERVAL"
done
