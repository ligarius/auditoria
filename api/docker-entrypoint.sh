#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

printf 'Applying database migrations...\n'
until npx prisma migrate deploy >/tmp/prisma-migrate.log 2>&1; do
  cat /tmp/prisma-migrate.log >&2 || true
  printf 'Database unavailable, retrying in 5 seconds...\n'
  sleep 5
  printf 'Re-attempting database migrations...\n'
  rm -f /tmp/prisma-migrate.log
done
cat /tmp/prisma-migrate.log >&2 || true
rm -f /tmp/prisma-migrate.log
printf 'Database migrations applied successfully.\n'

exec node dist/server.cjs
