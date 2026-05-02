# Origin backend image. Built by .github/workflows/deploy-azure-backend.yml,
# pushed to acroriginprod, run by ca-origin-backend-prod (Azure Container Apps).

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# Build deps for prisma engine + psycopg + native packages
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# uv for dependency management — pinned to a known-good version
COPY --from=ghcr.io/astral-sh/uv:0.5.4 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first for layer caching
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev || uv sync --no-dev

# Copy source
COPY src ./src
COPY prisma ./prisma
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Generate Prisma client at build time so first request isn't slow
RUN uv run prisma generate

ENV PORT=8080
EXPOSE 8080

CMD ["./start.sh"]
