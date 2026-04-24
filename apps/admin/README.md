# Car Leasing — Admin Dashboard

Internal web dashboard for fleet managers, sales, and finance teams.

## Getting Started

```bash
cd admin
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3002

## Pages

| Route | Description |
|---|---|
| `/` | Overview — key metrics at a glance |
| `/fleet` | Vehicle management — status, maintenance, availability |
| `/bookings` | Review and approve/reject customer bookings |
| `/customers` | Customer list and KYC document review |
| `/leases` | Active leases, upcoming renewals |
| `/reports` | Revenue, fleet utilisation, payment analytics |

## Roles

- `SUPER_ADMIN` — full access
- `FLEET_MANAGER` — fleet and maintenance only
- `SALES` — bookings and customers
- `FINANCE` — payments and reports