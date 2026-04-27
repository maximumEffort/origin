#!/usr/bin/env bash
# Origin backend startup script.
# Runs Prisma migrations (idempotent) then starts uvicorn.
#
# Used as the Docker CMD so every container revision picks up pending
# schema changes automatically. If migrations fail, the container still
# starts — the health check will catch DB connectivity issues.

set -euo pipefail

echo "[start.sh] Running Prisma migrate deploy..."
if prisma migrate deploy --schema /app/prisma/schema.prisma 2>&1; then
  echo "[start.sh] Migrations applied successfully."
else
  echo "[start.sh] ⚠️  Prisma migrate failed (exit $?) — starting app anyway."
  echo "[start.sh]    The health check will catch DB issues."
fi

echo "[start.sh] Starting uvicorn on port ${PORT:-3001}..."
exec uvicorn origin_backend.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-3001}" \
  --workers 2
