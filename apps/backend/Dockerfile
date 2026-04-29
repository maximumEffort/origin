# Multi-stage build for the FastAPI backend.
# Stage 1: install deps with uv into a managed venv.
# Stage 2: copy the venv + source into a slim runtime image.

# ── Stage 1: builder ────────────────────────────────────────────────
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        libatomic1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.5.0

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY prisma ./prisma
COPY src ./src
COPY README.md ./

RUN uv sync --no-dev

RUN uv run prisma generate

# ── Stage 2: runtime ───────────────────────────────────────────────
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        nodejs \
        ca-certificates \
        libatomic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app /app
COPY --from=builder /root/.cache/prisma-python /root/.cache/prisma-python

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 3001

# Prisma engine warm-up before uvicorn.
#
# PR #150 removed `prisma migrate deploy` from the CMD on the principle that
# migrations should run once in CI, not on every container restart. That's
# correct, but it inadvertently removed an *implicit* side-effect: invoking
# the Prisma JS CLI at startup primes the engine binary path resolution that
# the Python client relies on at first connect. Without the warm-up the
# Python client's first `await db.connect()` raises:
#
#   prisma.engine.errors.EngineConnectionError: Could not connect to the query engine
#   httpx.ConnectError: All connection attempts failed
#
# The fix: invoke `prisma --version` (lightweight, doesn't touch the DB,
# doesn't apply migrations) to trigger the same path setup. We deliberately
# do NOT swallow failures: if the prisma CLI itself can't run (missing
# binary, broken engine artefacts, exec errors), the entire warm-up was the
# point of this PR — letting the container continue would mean serving non-
# DB endpoints while every DB request fails. Better to exit non-zero so the
# deploy step fails loudly and a bad revision never replaces a good one.
# stdout is suppressed (we don't need the version table in every restart's
# logs); stderr stays visible so a failure mode surfaces in `az containerapp
# logs show`.
#
# Migrations themselves still run only in .github/workflows/deploy-azure-backend.yml
# (per #138 §6).
CMD ["sh", "-c", "prisma --version >/dev/null && exec uvicorn origin_backend.main:app --host 0.0.0.0 --port ${PORT:-3001}"]
