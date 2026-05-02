# Origin backend image. Built by .github/workflows/deploy-azure-backend.yml,
# pushed to acroriginprod, run by ca-origin-backend-prod (Azure Container Apps).

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/src

# Build deps for prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# uv for dependency management — pinned
COPY --from=ghcr.io/astral-sh/uv:0.5.4 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first for layer caching. uv.lock may not be present on first
# build after the rebuild — fall through to fresh resolution.
COPY pyproject.toml ./
COPY uv.lock* ./
RUN uv sync --frozen --no-dev 2>/dev/null || uv sync --no-dev

# Copy source
COPY src ./src
COPY prisma ./prisma
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Note: `prisma generate` runs at startup (see start.sh) rather than at build
# time. Keeps the build deterministic; engine binary is pulled on first boot
# and cached on the volume.

ENV PORT=8080
EXPOSE 8080

CMD ["./start.sh"]
