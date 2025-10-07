#!/usr/bin/env bash
set -euo pipefail
# Niega cualquier rastro de migrate deploy
if git grep -nE "prisma\s+migrate\s+deploy|migrate\s+deploy" -- ':!node_modules' ':!dist' ':!build' ':!README.md' ':!scripts/verify:no-migrate.sh' >/dev/null; then
  echo "[verify:no-migrate] 'prisma migrate deploy' detectado. Está prohibido en este repo."
  git grep -nE "prisma\s+migrate\s+deploy|migrate\s+deploy" -- ':!node_modules' ':!dist' ':!build' ':!README.md' ':!scripts/verify:no-migrate.sh'
  exit 1
fi
echo "[verify:no-migrate] OK: no hay migrate deploy en el repo."
