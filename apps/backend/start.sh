#!/bin/bash
set -euo pipefail

# Origin backend container entrypoint.
#
# Migrations run as a separate Container App Job (caj-origin-migrations)
# triggered by the deploy workflow — this script does NOT run them.
#
# /opt/venv/bin is on PATH; both `prisma` and `uvicorn` resolve there.
# PYTHONPATH=/app/src is set in the image so origin_backend is importable.
# Prisma client + JS CLI are pre-generated at build time (see Dockerfile),
# so no runtime network IO is needed before uvicorn starts.

exec uvicorn origin_backend.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
