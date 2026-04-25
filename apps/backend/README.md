# Car Leasing — Backend API

NestJS REST API powering the website, mobile app, and admin dashboard.

## Getting Started

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

- API: http://localhost:3001/v1
- Swagger docs: http://localhost:3001/docs

## Architecture

- **Framework:** NestJS 10 (TypeScript)
- **ORM:** Prisma 5 + PostgreSQL
- **Auth:** Phone OTP (Twilio) + JWT
- **Docs:** Auto-generated Swagger/OpenAPI

## Modules

| Module | Endpoints |
|---|---|
| `auth` | OTP send/verify, token refresh |
| `vehicles` | Fleet catalogue with filters |
| `calculator` | Instant lease quotes with VAT |
| `bookings` | Create, submit, track bookings |
| `customers` | Profile, KYC documents |
| `leases` | Active leases, payment schedule |
