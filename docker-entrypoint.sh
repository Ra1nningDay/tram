#!/bin/sh
set -eu

run_migrations() {
  attempts="${DB_MIGRATION_RETRIES:-20}"
  delay="${DB_MIGRATION_RETRY_DELAY:-3}"
  attempt=1

  while [ "$attempt" -le "$attempts" ]; do
    if ./node_modules/.bin/prisma migrate deploy; then
      return 0
    fi

    if [ "$attempt" -eq "$attempts" ]; then
      echo "Database migrations failed after ${attempts} attempts." >&2
      return 1
    fi

    echo "Database not ready yet, retrying migrations (${attempt}/${attempts})..." >&2
    attempt=$((attempt + 1))
    sleep "$delay"
  done
}

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  run_migrations
fi

exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
