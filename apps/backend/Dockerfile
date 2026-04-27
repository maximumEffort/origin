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

# Run Prisma migrations then start uvicorn — no shell script needed
CMD ["sh", "-c", "prisma migrate deploy 2>/dev/null || true && uvicorn origin_backend.main:app --host 0.0.0.0 --port ${PORT:-3001}"]
