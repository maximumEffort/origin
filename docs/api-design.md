> **⚠️ STALE — pre-rebuild (before 2026-05-02).** This document describes the v0 codebase that was wiped during the rebuild. It is kept for historical reference but is **not current**. For the live state see [`STATUS.md`](STATUS.md); for V1 design see [`architecture/rebuild-erd.md`](architecture/rebuild-erd.md).

---# API Design

> Chinese Car Leasing Platform — Dubai, UAE  
> Base URL: `https://api.[company-domain].ae/v1`

All responses are JSON. All amounts are in **AED**. Dates use **ISO 8601** (`YYYY-MM-DD`). Auth via `Authorization: Bearer <jwt>`.

---

## Authentication

### `POST /auth/otp/send`
Send OTP to a UAE mobile number.
```json
// Request
{ "phone": "+971501234567" }

// Response 200
{ "message": "OTP sent", "expires_in": 300 }
```

### `POST /auth/otp/verify`
Verify OTP and receive tokens.
```json
// Request
{ "phone": "+971501234567", "otp": "123456" }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "customer": { "id": "uuid", "full_name": "Amr Hassan", "kyc_status": "pending" }
}
```

### `POST /auth/refresh`
Refresh access token.
```json
// Request
{ "refresh_token": "eyJ..." }
// Response 200
{ "access_token": "eyJ..." }
```

---

## Vehicles

### `GET /vehicles`
List available vehicles with filters.

**Query params:**
| Param | Type | Example |
|---|---|---|
| `brand` | string | `BYD`, `HAVAL`, `CHERY`, `GEELY` |
| `category` | string | `suv`, `sedan`, `electric` |
| `fuel_type` | string | `electric`, `hybrid`, `petrol` |
| `min_price` | number | `1500` (AED/month) |
| `max_price` | number | `5000` |
| `available_from` | date | `2026-04-01` |
| `page` | number | `1` |
| `limit` | number | `20` |

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "brand": "BYD",
      "model": "Atto 3",
      "year": 2025,
      "category": { "id": "uuid", "name_en": "Electric SUV", "name_ar": "سيارة دفع رباعي كهربائية", "name_zh": "纯电动SUV" },
      "fuel_type": "electric",
      "colour": "Pearl White",
      "seats": 5,
      "monthly_rate_aed": 3200,
      "mileage_limit_monthly": 3000,
      "status": "available",
      "primary_image_url": "https://cdn.../byd-atto3.jpg"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

### `GET /vehicles/:id`
Get full vehicle details.

```json
// Response 200
{
  "id": "uuid",
  "brand": "BYD",
  "model": "Atto 3",
  "year": 2025,
  "vin": "LGXCE4CB0P0123456",
  "plate_number": "A 12345",
  "fuel_type": "electric",
  "transmission": "automatic",
  "colour": "Pearl White",
  "seats": 5,
  "daily_rate_aed": 150,
  "monthly_rate_aed": 3200,
  "mileage_limit_monthly": 3000,
  "status": "available",
  "images": [
    { "url": "https://cdn.../1.jpg", "is_primary": true }
  ],
  "category": { "id": "uuid", "name_en": "Electric SUV" }
}
```

---

## Lease Calculator

### `POST /calculator/quote`
Calculate lease cost before booking.

```json
// Request
{
  "vehicle_id": "uuid",
  "start_date": "2026-04-01",
  "end_date": "2026-09-30",
  "mileage_package": 3000,
  "add_ons": {
    "additional_driver": false,
    "cdw_waiver": true
  }
}

// Response 200
{
  "duration_days": 183,
  "base_amount_aed": 19200,
  "add_ons_amount_aed": 900,
  "subtotal_aed": 20100,
  "vat_rate": 0.05,
  "vat_amount_aed": 1005,
  "total_aed": 21105,
  "deposit_aed": 3200,
  "monthly_breakdown": [
    { "month": "April 2026", "amount_aed": 3200, "vat_aed": 160, "total_aed": 3360 }
  ]
}
```

---

## Bookings

### `POST /bookings`
Create a new booking (requires auth).

```json
// Request
{
  "vehicle_id": "uuid",
  "start_date": "2026-04-01",
  "end_date": "2026-09-30",
  "mileage_package": 3000,
  "add_ons": { "cdw_waiver": true },
  "pickup_location": "Dubai Marina, Dubai",
  "notes": "Please deliver to my address"
}

// Response 201
{
  "id": "uuid",
  "reference": "BK-2026-00123",
  "status": "draft",
  "quoted_total_aed": 20100,
  "vat_amount_aed": 1005,
  "grand_total_aed": 21105,
  "deposit_amount_aed": 3200
}
```

### `POST /bookings/:id/submit`
Submit booking and initiate deposit payment.

### `GET /bookings/:id`
Get booking details.

### `GET /bookings` *(customer)*
List customer's own bookings.

---

## Payments

### `POST /payments/session`
Create a Checkout.com payment session for a booking deposit.

```json
// Request
{ "booking_id": "uuid", "type": "deposit" }

// Response 200
{
  "session_id": "sid_...",
  "payment_token": "tok_...",
  "amount_aed": 3200,
  "vat_aed": 160,
  "total_aed": 3360
}
```

### `POST /webhooks/checkout`
Checkout.com payment webhook *(internal, verified by HMAC signature)*.

---

## Customers

### `GET /customers/me`
Get the authenticated customer's profile.

### `PATCH /customers/me`
Update profile (name, email, language preference).

```json
// Request
{ "full_name": "Amr Hassan", "preferred_language": "en", "whatsapp_opt_in": true }
```

### `POST /customers/me/documents`
Upload a KYC document.

```
Content-Type: multipart/form-data
Fields: type (emirates_id | driving_licence | visa | passport), file, expiry_date
```

### `GET /customers/me/documents`
List uploaded KYC documents and their status.

---

## Leases

### `GET /leases` *(customer)*
List customer's leases.

### `GET /leases/:id`
Get lease details including payment schedule.

```json
// Response 200
{
  "id": "uuid",
  "reference": "LS-2026-00456",
  "vehicle": { "brand": "BYD", "model": "Atto 3", "plate_number": "A 12345" },
  "start_date": "2026-04-01",
  "end_date": "2026-09-30",
  "monthly_rate_aed": 3200,
  "status": "active",
  "payments": [
    { "id": "uuid", "type": "monthly", "due_date": "2026-04-01", "total_aed": 3360, "status": "paid" },
    { "id": "uuid", "type": "monthly", "due_date": "2026-05-01", "total_aed": 3360, "status": "pending" }
  ],
  "agreement_url": "https://...signed-url..."
}
```

### `POST /leases/:id/renew`
Initiate lease renewal.

```json
// Request
{ "new_end_date": "2027-03-31", "mileage_package": 3000 }
```

---

## Admin Endpoints

> Requires `Authorization: Bearer <admin_jwt>` and appropriate role.

### Vehicles
- `GET /admin/vehicles` — full fleet list with status
- `POST /admin/vehicles` — add vehicle
- `PATCH /admin/vehicles/:id` — update vehicle
- `DELETE /admin/vehicles/:id` — retire vehicle

### Bookings
- `GET /admin/bookings` — all bookings with filters
- `POST /admin/bookings/:id/approve` — approve + auto-assign vehicle
- `POST /admin/bookings/:id/reject` — reject with reason
- `PATCH /admin/bookings/:id/assign` — manually assign vehicle

### Customers
- `GET /admin/customers` — customer list
- `GET /admin/customers/:id` — full profile + documents + lease history
- `POST /admin/customers/:id/kyc/approve` — approve KYC
- `POST /admin/customers/:id/kyc/reject` — reject with reason

### Leases
- `GET /admin/leases` — all leases with filters
- `POST /admin/leases/:id/terminate` — early termination

### Reporting
- `GET /admin/reports/revenue?period=monthly&from=2026-01-01&to=2026-03-31`
- `GET /admin/reports/fleet-utilisation`
- `GET /admin/reports/upcoming-renewals`

---

## Error Format

All errors follow a consistent shape:

```json
{
  "error": {
    "code": "VEHICLE_NOT_AVAILABLE",
    "message": "This vehicle is not available for the selected dates.",
    "message_ar": "هذه السيارة غير متاحة في التواريخ المحددة.",
    "message_zh": "该车辆在所选日期内不可用。"
  }
}
```

**Standard HTTP status codes:**
- `200` OK
- `201` Created
- `400` Bad Request (validation error)
- `401` Unauthorized
- `403` Forbidden (wrong role)
- `404` Not Found
- `409` Conflict (e.g. vehicle already booked)
- `422` Unprocessable Entity
- `500` Internal Server Error
- `503` Service Unavailable (health check failure)

---

## Health Check Endpoints

Health check endpoints are **not** behind the `/v1` prefix — they live at the root.

### `GET /health`
Full health check with database connectivity and memory status.
```json
// Response 200 (healthy)
{
  "status": "healthy",
  "timestamp": "2026-04-05T12:00:00.000Z",
  "uptime": 86400,
  "version": "0.1.0",
  "checks": {
    "database": { "status": "up", "latencyMs": 3 },
    "memory": { "status": "ok", "heapUsedMB": 85, "heapTotalMB": 120, "rssMB": 160 }
  }
}

// Response 503 (unhealthy — database down)
{
  "status": "unhealthy",
  "timestamp": "2026-04-05T12:00:00.000Z",
  "uptime": 86400,
  "version": "0.1.0",
  "checks": {
    "database": { "status": "down", "latencyMs": 5000 },
    "memory": { "status": "ok", "heapUsedMB": 85, "heapTotalMB": 120, "rssMB": 160 }
  }
}
```

### `GET /health/live`
Liveness probe — confirms the process is running. Lightweight, no database call.
```json
// Response 200
{ "status": "ok", "timestamp": "2026-04-05T12:00:00.000Z" }
```

### `GET /health/ready`
Readiness probe — confirms the database is reachable.
```json
// Response 200 (ready)
{ "status": "ready", "database": { "status": "up", "latencyMs": 3 } }

// Response 503 (not ready)
{ "status": "not_ready", "database": { "status": "down", "latencyMs": 5000 } }
```

**Notes:**
- Health endpoints skip rate limiting (`@SkipThrottle`)
- Returns actual HTTP 503 status codes (not just body fields) for load balancer detection
- Database error messages are logged server-side but not exposed in responses (security)
- Memory details are included for admin monitoring but contain no sensitive data
