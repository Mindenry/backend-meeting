#!/bin/sh
set -e

echo "[entrypoint] Starting backend container..."

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Prisma migrations complete"

echo "[entrypoint] Launching app: $*"
exec "$@"
