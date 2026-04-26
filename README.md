# Origin

Premium Chinese EV car rental platform for Dubai / UAE.

Customer site and admin dashboard for **Shanghai Car Rental LLC** (Abu Dhabi), under the **Origin** brand umbrella.

---

## Apps

| App | Path | Port (dev) | Description |
|---|---|---|---|
| Customer site | `apps/customer/` | 3000 | Trilingual customer website (EN / AR / ZH-CN). Browse fleet, calculator, booking, customer portal. |
| Admin dashboard | `apps/admin/` | 3002 | Internal ops tool. Fleet, customers, KYC, bookings, leases, reports. |
| Backend API | `apps/backend/` | 3001 | FastAPI + Prisma Python + PostgreSQL. Auth, vehicles, bookings, leases, payments, integrations. |

Both frontends consume the backend API via `NEXT_PUBLIC_API_URL`.

---

## Getting started

```bash
# 1. Clone
git clone git@github.com:maximumEffort/origin.git
cd origin

# 2. Install all workspace dependencies
npm install

# 3. Configure environment
cp apps/customer/.env.example apps/customer/.env.local
cp apps/admin/.env.example  apps/admin/.env.local
# Edit each file — point NEXT_PUBLIC_API_URL at the backend

# 4. Run
npm run customer:dev   # → http://localhost:3000
npm run admin:dev      # → http://localhost:3002

# Backend uses uv, not npm:
cd apps/backend && uv sync && uv run uvicorn origin_backend.main:app --reload --port 3001
```

### Toolchain

- Node 22 (frontends — see `.nvmrc`)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) (backend)

---

## Repo layout

```
origin/
├── apps/
│   ├── customer/        Next.js 15 — customer site (Vercel)
│   ├── admin/           Next.js 14 — admin dashboard (Vercel)
│   └── backend/      FastAPI — backend API (uv)
├── design/              Design system + Figma references
├── docs/                Architecture, API, data model, compliance notes
├── .github/             CI workflows + dependabot
├── CLAUDE.md            Project instructions (also read by AI assistants)
└── package.json         Workspace root
```

---

## Brand & compliance

- **Languages:** English, Arabic (RTL, legally required), Simplified Chinese
- **Currency:** AED (د.إ) with 5% VAT itemised separately
- **Regulatory:** RTA-registered fleet, UAE Federal Data Protection Law compliant, VAT TRN in all invoices
- **Operating entity:** Shanghai Car Rental LLC (Abu Dhabi Commercial Licence)

See `CLAUDE.md` for full project context and `design/DESIGN_SYSTEM.md` for design tokens.

---

## License

Proprietary — all rights reserved.
