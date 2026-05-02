#!/bin/bash
set -euo pipefail

# Origin backend container entrypoint.
#
# Migrations run as a separate Container App Job (caj-origin-migrations)
# triggered by the deploy workflow — this script does NOT run them.

# /opt/venv/bin is on PATH; both `prisma` and `uvicorn` resolve there.
# PYTHONPATH=/app/src is set in the image so origin_backend is importable.

# Warm up the Prisma engine. First boot downloads the binary (~30 MB);
# subsequent boots reuse the cached one. Failure is non-fatal — uvicorn
# will start anyway and the first DB call will retry.
prisma generate >/dev/null 2>&1 || true

exec uvicorn origin_backend.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
