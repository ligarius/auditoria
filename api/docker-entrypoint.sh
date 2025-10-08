#!/usr/bin/env bash
set -euo pipefail

echo "[api] generating Prisma client..."
npm run generate

echo "[api] applying migrations (deploy)..."
npm run db:deploy

if [ "${SEED:-0}" = "1" ]; then
  echo "[api] seeding..."
  npm run db:seed || true
fi

echo "[api] starting..."
exec npm run start
