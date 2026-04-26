# Origin Backend (Python)

FastAPI rewrite of the Node/NestJS backend. Both run side-by-side during
the migration; the frontends point at one or the other via
`NEXT_PUBLIC_API_URL`.

## Why this exists

The Node backend works. So why a Python rewrite?

1. **Operator clarity.** The team operating Origin will read, debug, and
   extend Python more easily than NestJS decorators.
2. **AI / data future.** Demand forecasting, AI-assisted customer
   support, OCR for KYC, predictive fleet maintenance — all Python-first.
   Better to land here once than glue Python services to a Node core.
3. **Pre-launch is the cheapest rewrite window.** Once paying customers
   exist, rewriting carries real risk. Right now it's translation.

The Node backend remains in `apps/backend/` until the Python service is
proven at parity. Then it's archived.

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
│   ├── auth/                # OTP + JWT + admin login
│   ├── common/              # Prisma client, auth deps, exception handlers
│   ├── customers/           # Customer profile + KYC documents
│   ├── health/              # /health endpoints
│   ├── vehicles/            # Vehicle list + detail
│   └── integrations/        # Twilio, SendGrid, Stripe wrappers
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

## Mapping from Node backend (cheat sheet)

| NestJS concept | FastAPI equivalent |
|---|---|
| `@Controller('auth')` | `APIRouter(prefix='/auth')` |
| `@Get('/me')` | `@router.get('/me')` |
| `@Body() dto: LoginDto` | `body: LoginRequest` (Pydantic model) |
| `@UseGuards(JwtAuthGuard)` | `Depends(get_current_user)` |
| `class AuthService` | A module of functions in `auth/service.py` |
| Module providers | FastAPI `Depends(...)` |
| `class-validator` decorators | Pydantic field validators |
| `JwtService` | `auth/jwt.py` helpers |
| `prisma.customer.findMany()` | `await db.customer.find_many()` (same API!) |

## Migration status

- [x] Auth: OTP send/verify, refresh, admin login
- [x] Health endpoints (/health, /health/live, /health/ready)
- [x] Vehicles
- [x] Customers + KYC documents
- [ ] Bookings
- [ ] Leases
- [ ] Payments + Stripe webhook
- [ ] Calculator (quote engine)
- [ ] Contact form
- [ ] Integrations (Twilio, SendGrid, Stripe, Google Maps, WhatsApp)
- [ ] Admin endpoints (full set)

Each module gets its own PR.
