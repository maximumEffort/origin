# Origin backend image. Built by .github/workflows/deploy-azure-backend.yml,
# pushed to acroriginprod, run by ca-origin-backend-prod (Azure Container Apps),
# and used by caj-origin-migrations (Container App Job) for prisma migrate deploy.

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/src \
    PRISMA_USE_GLOBAL_NODE=true

# System deps:
#   curl, ca-certificates, openssl — TLS, image health probes
#   libatomic1                     — required by Node 25.x ELF binary that
#                                    prisma-client-py would otherwise download
#                                    via nodeenv at runtime; missing in slim
#   nodejs, npm                    — Prisma's JS CLI runs on Node. Installing
#                                    from Debian repos + setting
#                                    PRISMA_USE_GLOBAL_NODE=true skips the
#                                    nodeenv download and gives us a stable
#                                    Node version pinned to the image
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates openssl \
      libatomic1 \
      nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# uv for Python dependency management — pinned
COPY --from=ghcr.io/astral-sh/uv:0.5.4 /uv /usr/local/bin/uv

WORKDIR /app

# Install Python deps first for layer caching. No uv.lock is committed yet —
# uv resolves fresh on each build until we commit one (slower but reliable).
COPY pyproject.toml ./
RUN uv sync

# Copy source + schema
COPY src ./src
COPY prisma ./prisma
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Pre-generate the Prisma client at build time. This downloads + installs the
# Prisma JS CLI (~prisma@5.17.0) and emits the Python bindings into the venv
# under prisma/. Doing this at build time means:
#   - the migration Container App Job runs `prisma migrate deploy` instantly,
#     no network IO during startup
#   - the API container also boots fast — no runtime npm install
RUN prisma generate

ENV PORT=8080
EXPOSE 8080

CMD ["./start.sh"]
