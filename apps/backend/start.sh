#!/bin/bash
set -euo pipefail

# Origin backend container entrypoint.
#
# Migrations run as a separate Container App Job (caj-origin-migrations)
# triggered by the deploy workflow — this script does NOT run them.
# It only warms the prisma client and starts uvicorn.

# Warm-up: ensure the prisma engine binary is in place. The build step ran
# `prisma generate`, but engines occasionally need re-warming after a cold
# container start.
uv run prisma generate >/dev/null 2>&1 || true

exec uv run uvicorn origin_backend.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
