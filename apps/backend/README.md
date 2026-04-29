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
cd apps/backend

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
apps/backend/
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

## Deployment (Azure Container Apps — UAE North)

The backend runs on Azure Container Apps in the `uaenorth` region —
provisioned by `infra/main.bicep` and deployed via
`.github/workflows/deploy-azure-backend.yml` on every push to `main`
that touches `apps/backend/**`. See `docs/adr/0001-azure-uae-north-architecture.md`
and `docs/STATUS.md` for the broader picture.

Production target (canonical):
`https://api.origin-auto.ae`

Container App FQDN (fallback):
`https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io`

### Runtime configuration

Secrets live in Azure Key Vault (`kv-origin-prod-uaenorth`) and are
mounted as env vars on the Container App via Bicep. Container App MI
has `Key Vault Secrets User`. Set/rotate via:

```bash
az keyvault secret set --vault-name kv-origin-prod-uaenorth \
  --name "<SECRET-NAME>" --value "..."
```

Env vars expected by the app:

```
JWT_SECRET                     # required, min 16 chars (KV: JWT-SECRET)
JWT_REFRESH_SECRET             # recommended in prod
APP_ENV=production
CORS_ALLOWED_ORIGINS           # comma-separated customer + admin URLs
VAT_RATE=0.05
DATABASE_URL                   # pg-origin-prod-uaenorth
AZURE_STORAGE_BLOB_ENDPOINT    # for KYC + vehicle image uploads

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
KYC_OCR_ENABLED=false          # ADR-0002 feature flag
```

### Webhooks

Register webhooks at the canonical URL:

- Checkout.com Dashboard → Webhooks → `POST https://api.origin-auto.ae/v1/webhooks/checkout`
- Stripe (when live keys are wired): same URL pattern.
