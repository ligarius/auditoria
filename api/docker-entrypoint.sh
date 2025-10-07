#!/usr/bin/env bash
set -euo pipefail

echo "[api] generating Prisma client..."
npm run generate

echo "[api] applying schema with Prisma db push (no migrations)..."
npm run db:push

if [ "${SEED:-1}" = "1" ]; then
  echo "[api] seeding..."
  npm run db:seed || true
fi

echo "[api] starting..."
exec npm run start
