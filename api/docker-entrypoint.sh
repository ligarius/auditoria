#!/usr/bin/env bash
set -euo pipefail

echo "[api] waiting for database..."
# opcional: si tienes un wait-for script, ejecútalo aquí
# /usr/src/app/scripts/wait-for db:5432 -- echo "db is up"

echo "[api] generating Prisma client..."
npx prisma generate

# =========================
# Opción A (simple, sin SQL externo): aplicar esquema con db push
# =========================
echo "[api] applying schema with Prisma db push (no migrations)..."
npx prisma db push

# =========================
# Opción B (recomendada si quieres baseline reproducible):
# Descomenta este bloque y comenta el bloque de db push de arriba.
# Requiere un archivo api/prisma/baseline.sql con el DDL inicial
# y una marca de aplicación para idempotencia.
# =========================
# if ! psql "$DATABASE_URL" -Atc "select to_regclass('__baseline_applied')" | grep -q "__baseline_applied"; then
#   echo "[api] applying baseline.sql..."
#   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ./prisma/baseline.sql
#   psql "$DATABASE_URL" -c "create table __baseline_applied(ts timestamptz default now()); insert into __baseline_applied default values();"
# else
#   echo "[api] baseline already applied, skipping."
# fi

# Seeds (si existen)
if [ "${SEED:-1}" = "1" ]; then
  echo "[api] seeding..."
  npm run seed || true
fi

echo "[api] starting..."
exec node dist/main.cjs
