> **⚠️ STALE — pre-rebuild (before 2026-05-02).** This document describes the v0 codebase that was wiped during the rebuild. It is kept for historical reference but is **not current**. For the live state see [`STATUS.md`](STATUS.md); for V1 design see [`architecture/rebuild-erd.md`](architecture/rebuild-erd.md).

---# Phase 6 — Integrations Setup Guide

This guide walks through setting up all third-party services for the [Company Name] platform.

---

## Overview

| Service | Purpose | Signup |
|---|---|---|
| WhatsApp Business API | Customer notifications & support | [Meta for Developers](https://developers.facebook.com/docs/whatsapp) |
| Checkout.com | Card payments, Apple Pay, Google Pay | [checkout.com](https://checkout.com) |
| Twilio | SMS OTP verification | [twilio.com](https://twilio.com) |
| SendGrid | Transactional email | [sendgrid.com](https://sendgrid.com) |
| Google Maps | Location picker, distance calc | [Google Cloud Console](https://console.cloud.google.com) |
| Firebase | Mobile push notifications | [Firebase Console](https://console.firebase.google.com) |
| Tabby | BNPL instalments (split payments) | [tabby.ai](https://tabby.ai) |

---

## 1. WhatsApp Business API

### What it does
Sends booking confirmations, payment reminders, lease expiry alerts, and KYC incomplete warnings via WhatsApp — in English, Arabic, and Chinese.

### Setup Steps
1. Go to [Meta for Developers](https://developers.facebook.com/) and create a Business App.
2. Add the **WhatsApp** product to your app.
3. Register a UAE phone number as your WhatsApp Business number.
4. Get your **Phone Number ID** and **Access Token** from the API Setup page.
5. Create **message templates** for each template key in `whatsapp.service.ts` — submit them for Meta approval (takes 1–2 business days).
6. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in `.env`.

### Webhook (Incoming Messages)
- Register `POST /v1/webhooks/whatsapp` in the Meta app dashboard.
- Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` to any secret string of your choice — Meta will call your endpoint to verify it.

### Template Naming Convention
Templates are named `{event}_{language}` — e.g. `booking_confirmed_en`, `payment_reminder_ar`. Create one for each event × language combination.

---

## 2. Checkout.com

### What it does
Handles card payments, Apple Pay, and Google Pay in AED. 3DS authentication is enabled by default (required for UAE).

### Setup Steps
1. Sign up at [checkout.com](https://checkout.com) and complete business verification.
2. Go to **Developers → Keys** to get your Secret Key and Public Key.
3. Go to **Developers → Webhooks** and register:
   - URL: `https://your-api-domain.ae/v1/webhooks/checkout`
   - Events: `payment_approved`, `payment_declined`, `payment_refunded`
4. Copy the **Webhook Secret** shown in the dashboard.
5. Set `CHECKOUT_SECRET_KEY`, `CHECKOUT_PUBLIC_KEY`, `CHECKOUT_WEBHOOK_SECRET` in `.env`.

### VAT Note
All amounts must include 5% UAE VAT. Use `checkoutService.calculateWithVat(baseAed)` to compute the correct total before creating a payment session.

---

## 3. Twilio — SMS OTP

### What it does
Sends 6-digit OTP codes to UAE mobile numbers (+971) for phone-based authentication.

### Setup Steps
1. Sign up at [twilio.com](https://twilio.com).
2. Go to **Verify → Services** and create a new Verify Service.
3. Note your **Account SID**, **Auth Token**, and **Verify Service SID**.
4. Purchase a UAE-capable phone number or use an alphanumeric sender ID (`[Company Name]`) where supported.
5. Set all `TWILIO_*` variables in `.env`.

### UAE Notes
- UAE mobile numbers are 10 digits starting with `05` locally, or `+971 5X XXX XXXX` internationally.
- `TwilioService.isValidUaePhone()` validates format before sending.
- Twilio's Verify API handles retry limits and fraud protection automatically.

---

## 4. SendGrid — Transactional Email

### What it does
Sends booking confirmations, payment receipts, lease expiry notices, and KYC incomplete alerts via email.

### Setup Steps
1. Sign up at [sendgrid.com](https://sendgrid.com) and verify your sender domain (e.g. `yourcompany.ae`).
2. Go to **Email API → Dynamic Templates** and create templates for each key in `EMAIL_TEMPLATES` (in `sendgrid.service.ts`).
3. Each template needs EN, AR, and ZH variants — name them using the `d-{event}-{lang}` convention.
4. Go to **Settings → API Keys** and create a new key with **Mail Send** permission.
5. Set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` in `.env`.

### RTL Email Note
For Arabic email templates, add `dir="rtl"` to your HTML container and use a right-aligned layout. SendGrid supports full HTML/CSS in dynamic templates.

---

## 5. Google Maps Platform

### What it does
- **Location autocomplete** — customer types a pickup/drop-off address, suggestions appear restricted to UAE.
- **Place details** — resolves a selected suggestion to coordinates.
- **Distance Matrix** — calculates driving distance for delivery fee logic.

### Setup Steps
1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a project.
2. Enable these APIs:
   - **Places API**
   - **Geocoding API**
   - **Distance Matrix API**
3. Create an API key under **APIs & Services → Credentials**.
4. Restrict the key:
   - For the backend: **IP restriction** (your server IP)
   - For the frontend widget (if used): **HTTP referrers** (your domain)
5. Set `GOOGLE_MAPS_API_KEY` in `.env`.

### Key Architecture Note
The API key is kept **server-side only**. The frontend calls `GET /v1/maps/autocomplete` and `GET /v1/maps/place-details` — both require JWT authentication. The key is never exposed to the browser.

---

## 6. Firebase — Push Notifications

### What it does
Sends push notifications to the Flutter mobile app for booking updates, payment reminders, and lease alerts.

### Setup Steps
1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Add an **Android** app and an **iOS** app to the project.
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) — place them in the Flutter project.
4. Go to **Project Settings → Service Accounts → Generate new private key** — download the JSON file.
5. Stringify the JSON file content and set it as `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env`.

### Flutter Integration
- The mobile app initialises `firebase_messaging` and requests notification permissions on first launch.
- The FCM token is sent to the backend (`POST /v1/customers/me/fcm-token`) and stored per device.
- `FirebaseService.sendToDevice(token, ...)` uses this token to push notifications.

---

## 7. Tabby — BNPL

### What it does
Allows customers to split their lease deposit into 4 equal monthly instalments — no interest, very popular in UAE.

### Setup Steps
1. Apply at [tabby.ai/business](https://tabby.ai/business) and complete merchant onboarding.
2. Get your **API Key** and **Merchant Code** from the Tabby Merchant Portal.
3. Set `TABBY_API_KEY`, `TABBY_MERCHANT_CODE`, and `TABBY_PUBLIC_KEY` in `.env`.
4. Add Tabby as an alternative payment option at checkout (shown alongside Checkout.com card option).

### UX Note
Tabby is shown as a payment option on the booking summary page. Tabby runs an instant eligibility check — if the customer is not eligible, the Checkout.com card option is shown instead. Use `tabbyService.checkEligibility()` before displaying the option.

---

## Environment Variables Summary

All variables are documented in `backend/.env.example`. Copy it to `backend/.env` and fill in each value before starting the server.

```bash
cp backend/.env.example backend/.env
# Then edit backend/.env with real values
```

---

## Integration Module Usage

All services are exported from `IntegrationsModule`. Import it in `AppModule`:

```typescript
// backend/src/app.module.ts
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    // ... other modules
    IntegrationsModule,
  ],
})
export class AppModule {}
```

Then inject any service into other modules:

```typescript
// In any NestJS service
constructor(
  private readonly whatsapp: WhatsAppService,
  private readonly checkout: CheckoutService,
) {}

// Send a WhatsApp booking confirmation
await this.whatsapp.sendBookingConfirmation(
  customer.phone,
  { customerName: customer.name, vehicleName: 'BYD Atto 3', startDate: '01/05/2026', bookingRef: 'BK-001' },
  'en',
);
```
