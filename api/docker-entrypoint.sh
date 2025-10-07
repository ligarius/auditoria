#!/usr/bin/env bash
set -euo pipefail

echo "[api] generating Prisma client..."
npx prisma generate

echo "[api] applying schema with Prisma db push (no migrations)..."
npx prisma db push

if [ "${SEED:-1}" = "1" ]; then
  echo "[api] seeding..."
  npm run seed || true
fi

echo "[api] starting..."
exec node dist/main.js
