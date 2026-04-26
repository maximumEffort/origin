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
