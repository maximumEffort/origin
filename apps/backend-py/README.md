# Origin Backend

FastAPI service that the customer + admin frontends consume via
`NEXT_PUBLIC_API_URL`. Was rewritten from a NestJS service pre-launch
for operator clarity (the team reads Python more easily than NestJS
decorators) and to keep AI / data work (demand forecasting,
KYC OCR, predictive maintenance) in a single language.

## Stack

| Concern | Pick |
|---|---|
| Web framework | **FastAPI** (async, auto-OpenAPI, Pydantic-native) |
| Validation + settings | **Pydantic v2** + **pydantic-settings** |
| Database / ORM | **Prisma Python** (same `schema.prisma` as the Node backend) |
| Auth | `python-jose` (JWT) + `passlib[bcrypt]` |
| HTTP client | `httpx` |
| Tests | `pytest` + `pytest-asyncio` |
| Linter / formatter | `ruff` (replaces black + isort + flake8) |
| Type checker | `mypy --strict` |
| Package manager | `uv` (modern, fast, replaces pip + poetry + pipx) |

## Quickstart

You'll need Python 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
cd apps/backend-py

# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh
# (or on Windows PowerShell: irm https://astral.sh/uv/install.ps1 | iex)

# Install dependencies into a managed virtualenv
uv sync

# Generate the Prisma client (reads our schema.prisma)
uv run prisma generate

# Configure environment
cp .env.example .env
# edit .env — at minimum set DATABASE_URL and JWT_SECRET

# Run the dev server
uv run uvicorn origin_backend.main:app --reload --port 3001
```

Visit http://localhost:3001/docs for the auto-generated OpenAPI UI.

## Project structure

```
apps/backend-py/
├── pyproject.toml           # Project metadata + deps + tool config
├── prisma/
│   ├── schema.prisma        # Same schema as apps/backend (Node)
│   └── partials.py          # Custom Prisma partial types (empty for now)
├── src/origin_backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── config.py            # Pydantic settings (env vars)
│   ├── admin/               # Back-office: bookings, KYC, fleet, dashboard
│   ├── auth/                # OTP + JWT + admin login
│   ├── bookings/            # Customer booking lifecycle
│   ├── calculator/          # Quote engine (VAT, mileage, add-ons)
│   ├── common/              # Prisma client, auth deps, exception handlers
│   ├── contact/             # Public contact-form submissions
│   ├── customers/           # Customer profile + KYC documents
│   ├── health/              # /health endpoints
│   ├── leases/              # Customer lease list, detail, renew
│   ├── maps/                # Google Maps proxy (autocomplete, place-details)
│   ├── payments/            # Stripe PaymentIntent creation
│   ├── vehicles/            # Vehicle list + detail
│   ├── webhooks/            # Inbound webhooks (Checkout.com)
│   └── integrations/        # Twilio, SendGrid, Stripe, Maps, WhatsApp, Firebase, Tabby, Checkout
└── tests/
    ├── conftest.py          # Shared fixtures (mocked Prisma)
    ├── test_auth_jwt.py     # JWT round-trip tests
    └── test_auth_router.py  # Endpoint tests via TestClient
```

## Day-to-day commands

```bash
# Run the dev server with auto-reload
uv run uvicorn origin_backend.main:app --reload --port 3001

# Run tests
uv run pytest

# Run a specific test
uv run pytest tests/test_auth_jwt.py::test_issue_pair_returns_two_distinct_tokens -v

# Lint + auto-fix
uv run ruff check --fix .
uv run ruff format .

# Type check
uv run mypy src/

# Regenerate Prisma client after schema changes
uv run prisma generate
```

## Surface area

| Module | Endpoints |
|---|---|
| Auth | OTP send/verify, refresh, admin login |
| Health | `/health`, `/health/live`, `/health/ready` |
| Vehicles | List + detail (public) |
| Customers + KYC | Profile + document upsert (own user only) |
| Bookings | Create, submit, list, detail (own bookings) |
| Calculator | Instant quote with VAT |
| Leases | List, detail, renew (own leases) |
| Payments | Stripe PaymentIntent creation |
| Contact | Public inquiry submission |
| Maps | Server-side Google Maps proxy (autocomplete, place-details) |
| Admin | 14 endpoints — bookings, customers/KYC, leases, fleet, dashboard. Role-gated (`SUPER_ADMIN` / `SALES` / `FLEET_MANAGER` / `FINANCE`). |
| Webhooks | `POST /v1/webhooks/checkout` for Checkout.com |

Outbound integrations: Twilio Verify (OTP), SendGrid (emails),
Stripe (PaymentIntent), Google Maps (Places + Geocoding + Distance),
WhatsApp Business, Firebase Cloud Messaging, Tabby (BNPL),
Checkout.com (cards / Apple Pay / Google Pay).

## Deployment (Railway)

`railway.toml` in this directory wires Railway up to the multi-stage
Dockerfile and points the healthcheck at `/health/ready`.

`.github/workflows/deploy-backend.yml` auto-deploys on every push to
`main` that touches `apps/backend-py/**`. Manual re-deploys via the
"Run workflow" button (e.g. after rotating a secret).

### One-time setup

1. **Create the Railway project** and a service named `backend` (or
   set the `RAILWAY_SERVICE_NAME` repo variable to whatever you call
   it). Point the service at this repo, root directory `apps/backend-py/`.
2. **Provision Postgres** in the same Railway project; Railway will
   inject `DATABASE_URL` into the service automatically.
3. **Set the runtime env vars** in the Railway service settings:

   ```
   JWT_SECRET                     # required, min 16 chars
   JWT_REFRESH_SECRET             # recommended in prod
   APP_ENV=production
   CORS_ALLOWED_ORIGINS           # comma-separated; the customer + admin URLs
   VAT_RATE=0.05

   # Integrations — only set the ones in use for the current env
   TWILIO_ACCOUNT_SID
   TWILIO_AUTH_TOKEN
   TWILIO_VERIFY_SERVICE_SID
   SENDGRID_API_KEY
   SENDGRID_FROM_EMAIL
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   GOOGLE_MAPS_API_KEY
   WHATSAPP_ACCESS_TOKEN
   WHATSAPP_PHONE_NUMBER_ID
   FIREBASE_SERVICE_ACCOUNT_JSON  # whole service-account JSON, single line
   TABBY_API_KEY
   TABBY_MERCHANT_CODE
   CHECKOUT_SECRET_KEY
   CHECKOUT_WEBHOOK_SECRET
   ```

4. **Set repo secrets** for the deploy workflow:
   - `RAILWAY_TOKEN` — project token from Railway dashboard → Project
     Settings → Tokens.
   - (optional) repo variable `RAILWAY_SERVICE_NAME` if the service
     isn't called `backend`.
5. **First deploy** runs on the next push to `main` (or trigger
   manually via Actions → Deploy backend (Railway) → Run workflow).
6. **Cut the frontends over** — set `NEXT_PUBLIC_API_URL` on both the
   customer and admin Vercel projects to
   `https://<railway-domain>/v1`. Vercel auto-redeploys on env-var
   change.
7. **Re-register webhooks** at the new domain:
   - Checkout.com Dashboard → Webhooks →
     `POST https://<railway-domain>/v1/webhooks/checkout`
   - Stripe (when wired): same URL pattern.
