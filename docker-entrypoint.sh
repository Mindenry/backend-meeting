#!/bin/sh
set -e

echo "[entrypoint] Starting backend container..."

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1 ]; then
    echo "[entrypoint] Migration failed, attempting to baseline existing database..."
    # Mark all migrations as applied without running them
    for migration in $(ls -1 prisma/migrations | grep -E '^[0-9]' | sort); do
      echo "[entrypoint] Resolving migration: $migration"
      npx prisma migrate resolve --applied "$migration" || true
    done
    echo "[entrypoint] Baseline complete, retrying migrate deploy..."
    npx prisma migrate deploy
  else
    exit $EXIT_CODE
  fi
}

echo "[entrypoint] Prisma migrations complete"

echo "[entrypoint] Launching app: $*"
exec "$@"
