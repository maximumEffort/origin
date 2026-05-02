# Origin backend

Modular monolith. FastAPI + Prisma Python + PostgreSQL.

**This is the V1 rebuild** (started 2026-05-02). For the architectural reference, see `docs/architecture/rebuild-erd.md` (v0.5).

## Module layout

```
src/origin_backend/
  core/                 primitives (kernel, messaging, observability)
  platform/             cross-cutting capabilities (countries, identity, inventory, pricing, billing, agreements)
  products/             revenue verticals (rental — V1 active; lease_to_own, purchase — stubs)
  services/             external adapters (communications, intelligence, location, payments, storage)
  gateways/             HTTP entry points (public_api, admin_api, webhook_receiver)
```

Inter-module rules: see §2 of `docs/architecture/rebuild-erd.md`.

## Local dev

```bash
cd apps/backend
uv sync
cp .env.example .env  # then fill DATABASE_URL etc.
uv run prisma generate
uv run prisma migrate deploy
uv run uvicorn origin_backend.main:app --reload --port 8080
```

Smoke test:
```bash
curl http://localhost:8080/health/ready
# {"status": "ready"}
```

## Production deploy

GitHub Actions workflow `deploy-azure-backend.yml` fires on push to `main` for `apps/backend/**`. Builds the image into ACR, runs the migrations Container App Job, rolls a new revision.

## Drop-and-rebuild the prod DB (one-time, this rebuild only)

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Then trigger a deploy. The migrations job applies `prisma/migrations/20260502120000_v1_genesis` cleanly to the empty schema.

## Tests

```bash
uv run pytest
```
