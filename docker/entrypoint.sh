#!/bin/sh
set -eu

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  pnpm prisma migrate deploy
fi

exec pnpm exec next start --hostname 0.0.0.0 --port "${PORT:-3000}"
