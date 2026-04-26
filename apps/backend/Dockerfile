# Multi-stage build for the FastAPI backend.
# Stage 1: install deps with uv into a managed venv.
# Stage 2: copy the venv + source into a slim runtime image.

# ── Stage 1: builder ────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# libatomic1 is required by the Node binary that prisma-client-py
# downloads via nodeenv during `prisma generate` — without it the
# Node binary fails with "error while loading shared libraries:
# libatomic.so.1: cannot open shared object file".
RUN apt-get update && apt-get install -y --no-install-recommends \
        libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package installer, replaces pip)
RUN pip install --no-cache-dir uv==0.5.0

WORKDIR /app

# Copy only what's needed to resolve deps (cache-friendly)
COPY pyproject.toml uv.lock ./
COPY prisma ./prisma
COPY src ./src
COPY README.md ./

# Install deps + project into a project-local venv
RUN uv sync --frozen --no-dev

# Generate Prisma client (uses schema.prisma)
RUN uv run prisma generate

# ── Stage 2: runtime ───────────────────────────────────────────────
FROM python:3.12-slim

# Install Node.js for prisma-client-py runtime (it shells out to the
# Prisma query engine which is a Rust binary, but the CLI uses Node).
RUN apt-get update && apt-get install -y --no-install-recommends \
        nodejs \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the pre-built venv + source from the builder stage
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 3001

# Production server: gunicorn with uvicorn workers
# 2 workers is fine for 2 vCPU; tune later.
CMD ["uvicorn", "origin_backend.main:app", "--host", "0.0.0.0", "--port", "3001", "--workers", "2"]
