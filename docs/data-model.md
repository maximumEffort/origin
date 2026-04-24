# Data Model

> Chinese Car Leasing Platform — Dubai, UAE

This document defines all core entities, their fields, relationships, and business rules.

---

## Entity Overview

```
Vehicle
  └── VehicleCategory
  └── VehicleImage[]

Customer
  └── Document[]

Booking
  ├── Customer
  ├── Vehicle
  └── Lease (created on approval)

Lease
  ├── Customer
  ├── Vehicle
  └── Payment[]

Payment
  └── Lease

NotificationLog
```

---

## 1. Vehicle

Represents a physical car in the fleet.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `vin` | String | Vehicle Identification Number (unique) |
| `plate_number` | String | UAE plate number |
| `brand` | Enum | `BYD`, `HAVAL`, `GWM`, `CHERY`, `OMODA`, `GEELY`, `JAECOO` |
| `model` | String | e.g. "BYD Atto 3", "HAVAL Jolion" |
| `year` | Integer | Manufacturing year |
| `category_id` | UUID | FK → VehicleCategory |
| `fuel_type` | Enum | `electric`, `hybrid`, `petrol`, `diesel` |
| `transmission` | Enum | `automatic`, `manual` |
| `colour` | String | |
| `seats` | Integer | |
| `status` | Enum | `available`, `leased`, `maintenance`, `retired` |
| `daily_rate_aed` | Decimal | Base daily rate before add-ons |
| `monthly_rate_aed` | Decimal | Base monthly rate |
| `mileage_limit_monthly` | Integer | Default km/month included |
| `rta_registration_expiry` | Date | Alert 60 days before |
| `insurance_expiry` | Date | Alert 30 days before |
| `last_service_date` | Date | |
| `next_service_due` | Date | |
| `notes` | Text | Internal notes |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### VehicleCategory

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name_en` | String | e.g. "SUV", "Sedan", "Electric" |
| `name_ar` | String | Arabic translation |
| `name_zh` | String | Simplified Chinese |
| `icon` | String | Icon identifier for UI |

### VehicleImage

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `vehicle_id` | UUID | FK → Vehicle |
| `url` | String | CDN URL |
| `is_primary` | Boolean | Main listing image |
| `sort_order` | Integer | |

---

## 2. Customer

A person who has registered on the platform.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `phone` | String | UAE format: `+971XXXXXXXXX` (used for OTP login) |
| `email` | String | Optional |
| `full_name` | String | |
| `nationality` | String | ISO country code |
| `preferred_language` | Enum | `en`, `ar`, `zh` |
| `kyc_status` | Enum | `pending`, `submitted`, `approved`, `rejected` |
| `whatsapp_opt_in` | Boolean | Consent for WhatsApp messages |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### Document (KYC)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `customer_id` | UUID | FK → Customer |
| `type` | Enum | `emirates_id`, `driving_licence`, `visa`, `passport` |
| `file_url` | String | Secure storage URL |
| `expiry_date` | Date | |
| `status` | Enum | `pending`, `approved`, `rejected`, `expired` |
| `rejection_reason` | String | If rejected |
| `uploaded_at` | Timestamp | |
| `reviewed_at` | Timestamp | |
| `reviewed_by` | UUID | FK → AdminUser |

---

## 3. Booking

A lease request initiated by a customer, pending admin approval.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `reference` | String | Human-readable, e.g. `BK-2026-00123` |
| `customer_id` | UUID | FK → Customer |
| `vehicle_id` | UUID | FK → Vehicle (preferred) |
| `assigned_vehicle_id` | UUID | FK → Vehicle (actual assigned) |
| `lease_type` | Enum | `short_term` (1–29 days), `long_term` (30+ days) |
| `start_date` | Date | Requested start |
| `end_date` | Date | Requested end |
| `duration_days` | Integer | Computed |
| `mileage_package` | Integer | km/month selected |
| `add_ons` | JSONB | e.g. `{"additional_driver": true, "cdw": true}` |
| `quoted_total_aed` | Decimal | Total before VAT |
| `vat_amount_aed` | Decimal | 5% VAT |
| `grand_total_aed` | Decimal | Total incl. VAT |
| `deposit_amount_aed` | Decimal | |
| `deposit_paid` | Boolean | |
| `status` | Enum | `draft`, `submitted`, `approved`, `rejected`, `cancelled`, `converted` |
| `rejection_reason` | String | |
| `pickup_location` | String | Address or coordinates |
| `dropoff_location` | String | |
| `notes` | Text | Customer notes |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

---

## 4. Lease

An active or historical lease agreement. Created when a Booking is approved.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `reference` | String | e.g. `LS-2026-00456` |
| `booking_id` | UUID | FK → Booking |
| `customer_id` | UUID | FK → Customer |
| `vehicle_id` | UUID | FK → Vehicle |
| `start_date` | Date | Actual start |
| `end_date` | Date | Agreed end |
| `monthly_rate_aed` | Decimal | Locked rate at signing |
| `vat_rate` | Decimal | 0.05 (5%) |
| `mileage_limit_monthly` | Integer | km/month |
| `status` | Enum | `active`, `completed`, `terminated_early`, `renewed` |
| `renewal_of` | UUID | FK → Lease (if this is a renewal) |
| `agreement_pdf_url` | String | Signed agreement document |
| `notes` | Text | |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

---

## 5. Payment

Individual payment records tied to a lease.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `lease_id` | UUID | FK → Lease |
| `customer_id` | UUID | FK → Customer |
| `type` | Enum | `deposit`, `monthly`, `penalty`, `refund` |
| `amount_aed` | Decimal | Before VAT |
| `vat_amount_aed` | Decimal | |
| `total_aed` | Decimal | |
| `due_date` | Date | |
| `paid_at` | Timestamp | Null if unpaid |
| `status` | Enum | `pending`, `paid`, `overdue`, `waived`, `refunded` |
| `payment_method` | Enum | `card`, `apple_pay`, `google_pay`, `bank_transfer` |
| `gateway` | Enum | `checkout_com`, `paytabs`, `tabby` |
| `gateway_reference` | String | External transaction ID |
| `invoice_pdf_url` | String | VAT-compliant invoice |
| `created_at` | Timestamp | |

---

## 6. NotificationLog

Audit trail of all automated messages sent (required for UAE compliance).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `customer_id` | UUID | FK → Customer |
| `channel` | Enum | `whatsapp`, `sms`, `email`, `push` |
| `template` | String | Template key, e.g. `booking_confirmation` |
| `language` | Enum | `en`, `ar`, `zh` |
| `content_snapshot` | Text | Message content at time of sending |
| `status` | Enum | `sent`, `delivered`, `failed` |
| `sent_at` | Timestamp | |
| `metadata` | JSONB | Provider response, message ID, etc. |

---

## 7. AdminUser

Internal staff accounts.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `email` | String | Login credential |
| `full_name` | String | |
| `role` | Enum | `super_admin`, `fleet_manager`, `sales`, `finance` |
| `is_active` | Boolean | |
| `created_at` | Timestamp | |

---

## Business Rules

- VAT is always **5%** and must be stored and displayed separately from the base amount.
- A Booking can only be `approved` if the Customer's `kyc_status` is `approved`.
- A Vehicle can only be assigned to one active Lease at a time.
- `insurance_expiry` and `rta_registration_expiry` must be tracked on every vehicle; alerts fire at 30 and 60 days respectively.
- All KYC documents are stored in a private, access-controlled storage bucket — never publicly accessible.
- NotificationLog entries must never be deleted — append-only for compliance.
- Lease agreements must be generated as PDFs and stored with a signed URL.
