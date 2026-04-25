# API Integration Guide — Origin Leasing

**Project:** Origin Car Leasing Platform  
**Domain:** origin-auto.ae  
**Company:** Origin (Shanghai Car Rental LLC)  
**Tech Stack:** NestJS Backend | Next.js Frontend | Flutter Mobile App  
**Region:** Dubai, UAE  
**Last Updated:** 2026-03-31

---

## Table of Contents

1. [Checkout.com](#checkoutcom)
2. [Twilio](#twilio)
3. [SendGrid](#sendgrid)
4. [WhatsApp Business API](#whatsapp-business-api)
5. [Firebase](#firebase)
6. [Tabby](#tabby)
7. [Google Maps Platform](#google-maps-platform)
8. [Environment Variables Checklist](#environment-variables-checklist)

---

## Checkout.com

### Overview

Checkout.com is the primary payment processor for Origin Leasing. It supports AED, 3D Secure (mandatory for UAE), and is well-established in the UAE market.

### Prerequisites

- Business registration documents for Origin (Shanghai Car Rental LLC) registered in Abu Dhabi or Dubai
- UAE trade license (copy)
- Proof of address (utility bill or business premises lease)
- Passport copy of authorized signatory
- Origin's tax registration number (if applicable)
- Bank account details for payouts in AED

### Step-by-Step Instructions

#### 1. Create a Business Account

1. Visit [checkout.com](https://checkout.com)
2. Click **"Sign Up"** → Select **"I'm a business"**
3. Choose region: **Middle East**
4. Enter business details:
   - Legal name: `Origin (Shanghai Car Rental LLC)`
   - Entity type: `Limited Liability Company`
   - Country of incorporation: `United Arab Emirates`
   - Business registration number: [Your UAE trade license number]
   - Business address: [Dubai/Abu Dhabi office address]
5. Select primary business category: **Vehicle Rental & Leasing**
6. Enter expected monthly transaction volume (AED)
7. Proceed to KYC verification

#### 2. Complete KYC (Know Your Customer) for UAE Business

1. In the Checkout.com dashboard, navigate to **Settings > Compliance > KYC**
2. Upload the following documents:
   - **Trade License:** High-resolution scan (both sides), must be current and valid
   - **Proof of Address:** Recent utility bill, business premises lease, or property registration
   - **Beneficial Owner Details:** Passport copies and proof of address for all owners with >25% stake
   - **Authorized Signatory:** ID and proof of authority (board resolution or notarized letter)
   - **Bank Statement:** Last 3 months showing business activity (account must match payout bank)
3. Submit for verification. This typically takes 2–5 business days.
4. Monitor email and dashboard for any requests for additional documentation.

#### 3. Obtain Production API Keys

1. Once KYC is approved, log into the Checkout.com dashboard
2. Navigate to **Settings > API Keys**
3. You'll see two environments:
   - **Live** (production) — for real transactions
   - **Test** (sandbox) — for development
4. Copy and securely store:
   - **Public API Key (Live):** Starts with `pk_live_...`
   - **Secret API Key (Live):** Starts with `sk_live_...`
5. Create a separate pair of keys for the backend server (if not already created)

#### 4. Configure Production Webhooks

Webhooks deliver real-time notifications of payment events to your backend.

1. In the Checkout.com dashboard, navigate to **Settings > Webhooks**
2. Click **"Add Webhook Endpoint"**
3. Enter webhook URL: `https://api.origin-auto.ae/v1/webhooks/checkout`
4. Select events to subscribe to:
   - `payment_approved` — successful payment
   - `payment_declined` — declined payment
   - `payment_captured` — payment captured (if using manual capture)
   - `payment_voided` — payment voided
   - `payment_refunded` — payment refunded
   - `charge_back` — chargeback initiated
5. Copy the **Webhook Signing Secret** (provided after creation)
6. Test the webhook using Checkout.com's test event feature before going live

#### 5. Enable 3D Secure (3DS) for UAE Compliance

3D Secure is required by UAE Central Bank regulations for all online card payments.

1. In the dashboard, navigate to **Settings > Risk & Security**
2. Find the **3D Secure** section
3. Set to: **Enabled (Always)**
4. Configure 3DS rules:
   - **Challenge Type:** Frictionless (preferred) with fallback to Challenge
   - **Exemptions:** None (UAE law requires 3DS for all cards)
5. Ensure your frontend integrates Checkout.com's 3DS flow (see backend integration docs)

#### 6. Configure AED Currency

1. In **Settings > Currencies**
2. Ensure **AED** is enabled
3. Verify settlement currency is set to **AED** (under **Payout Settings**)
4. Set up payout schedule:
   - Recommended: Daily or next-business-day payouts to your UAE bank account

#### 7. Enable Live Mode

1. Navigate to **Settings > Environment**
2. Toggle from **Test** to **Live**
3. A warning will appear — confirm that you've tested thoroughly in sandbox
4. Live mode is now active; all transactions will be real

### Environment Variables

```bash
CHECKOUT_PUBLIC_KEY_LIVE=pk_live_xxxxx
CHECKOUT_SECRET_KEY_LIVE=sk_live_xxxxx
CHECKOUT_WEBHOOK_SECRET=whsk_xxxxx
CHECKOUT_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/checkout
CHECKOUT_CURRENCY=AED
CHECKOUT_ENVIRONMENT=live
```

### Verification & Testing Steps

1. **Backend Integration Test:**
   - Create a test booking in the admin panel
   - Attempt payment with a valid AED test card
   - Verify that the payment is captured and webhook is received
   - Check the Checkout.com dashboard for the transaction

2. **Webhook Verification:**
   - Log the webhook payload in your backend
   - Verify webhook signature using the signing secret
   - Ensure payment status is updated in the database

3. **3DS Test:**
   - Use a test card that requires 3DS (provided by Checkout.com)
   - Verify that the 3DS challenge flow is triggered
   - Complete authentication and verify payment success

4. **Payout Test:**
   - Process a few live transactions (small amounts)
   - Wait for the payout window (typically 24 hours)
   - Verify funds arrive in the Origin bank account

### Troubleshooting

| Issue | Solution |
|-------|----------|
| KYC approval delayed | Contact Checkout.com support with reference number; may require additional docs |
| Webhooks not received | Verify endpoint URL is publicly accessible; check firewall rules; test with manual event trigger in dashboard |
| 3DS not triggering | Ensure card is 3DS-eligible; verify 3DS is enabled in backend configuration; test with Checkout.com test cards |
| Payout failures | Verify bank account IBAN/SWIFT details; ensure account holder matches business registration |
| Transaction declined | Check fraud rules in Risk & Security settings; verify merchant category code is correct for car leasing |

---

## Twilio

### Overview

Twilio provides SMS and OTP verification services. In the UAE market, a local number (+971) is essential for customer trust and SMS delivery.

### Prerequisites

- Twilio account (can start with free tier, will upgrade to paid)
- USD credit card for account activation and billing
- UAE business registration details (for compliance)
- Designated phone number or contact person for the +971 number registration

### Step-by-Step Instructions

#### 1. Sign Up for Twilio Paid Account

1. Visit [twilio.com](https://twilio.com)
2. Click **"Sign Up"** and create account using company email (origin@origin-auto.ae preferred)
3. During signup, Twilio will ask:
   - **Primary use case:** Select "Two-Factor Authentication" or "SMS"
   - **Phone number country:** United Arab Emirates
   - **Language preference:** English
4. Verify email address
5. Add a payment method (USD credit card)
6. Upgrade from trial to paid account:
   - Visit **Account > Billing > Upgrade Account**
   - Add credit card and confirm upgrade
   - Trial credits expire; you'll be billed for usage going forward

#### 2. Purchase a UAE Phone Number (+971)

1. In the Twilio Console, navigate to **Phone Numbers > Buy a Number**
2. Select region: **United Arab Emirates**
3. Number type: **SMS & Voice**
4. Search for available numbers (Twilio shows options like +971 50 XXX XXXX)
5. Select a memorable number if available (e.g., ending in a sequence)
6. Click **"Buy"** and confirm purchase (~USD 1.00/month)
7. The number is now assigned to your account and can be used immediately

#### 3. Configure Verify Service for OTP

The Verify Service automates OTP generation, delivery, and validation.

1. Navigate to **Verify > Services** in the Twilio Console
2. Click **"Create new Service"**
3. Service name: `Origin Leasing OTP`
4. Configure settings:
   - **Friendly name:** Origin Leasing OTP
   - **Default language:** English
5. After creation, configure the service:
   - **Code length:** 6 digits
   - **Expiration time:** 10 minutes (standard for security)
   - **Delivery channels:** SMS (primary) + Voice (backup)
   - **Attempt limits:** Max 5 attempts per verification
6. Copy the **Service SID** (starts with `VA...`)

#### 4. Set Up Alphanumeric Sender ID

Alphanumeric sender IDs (like "Origin") improve trust compared to generic numbers. However, UAE regulations require approval.

1. In Twilio Console, navigate to **Phone Numbers > Sender Identities**
2. Click **"Create Sender Identity"**
3. Enter:
   - **Sender ID:** `Origin` (up to 11 characters)
   - **Country:** United Arab Emirates
   - **Use case:** Two-Factor Authentication
   - **Company name:** Origin (Shanghai Car Rental LLC)
   - **Upload supporting docs:** Business license copy
4. Submit for approval. Typically approved within 24–48 hours.
5. Once approved, use "Origin" as the sender ID in API calls

#### 5. Configure Rate Limits

To prevent abuse, set rate-limiting rules in your backend (Twilio will enforce some limits server-side as well).

1. In Twilio Console, navigate to **Account > API Credentials**
2. Note the rate-limiting defaults (usually 100 requests per second per account)
3. In your backend code, implement client-side rate limiting:
   - Max 3 OTP requests per phone number per hour
   - Max 5 verification attempts per OTP
   - Exponential backoff between retries

#### 6. Verify UAE Telecom Compliance (TRA Registration)

UAE telecom regulations (through TRA — Telecommunications Regulatory Authority) may require registration for bulk SMS.

1. **Contact Twilio Support:**
   - Open ticket requesting "UAE TRA compliance for bulk SMS"
   - Provide business registration and sender ID details
2. **Alternative:** Work with a UAE-local SMS provider if Twilio's compliance coverage is insufficient
3. Document compliance status with your legal team

### Environment Variables

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+971501234567
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SENDER_ID=Origin
TWILIO_REGION=ae
```

### Verification & Testing Steps

1. **SMS Delivery Test:**
   - Use Twilio Console > SMS > Send a test message
   - Send to a personal phone number
   - Verify message arrives within seconds

2. **OTP Verification Test:**
   - In your app, request OTP for a test phone number
   - Twilio will send a code
   - Submit the code back to your API
   - Verify the API returns `status: approved`

3. **Alphanumeric Sender ID Test:**
   - Once approved, send an SMS with sender ID "Origin"
   - Verify the message displays "Origin" as the sender (not a number)

4. **Rate Limiting Test:**
   - Attempt 4 OTP requests in quick succession
   - Verify the 4th request is rate-limited (rejected or delayed)

5. **Backup Voice Channel Test:**
   - Request OTP delivery via voice
   - Verify an automated call is made to the test number

### Troubleshooting

| Issue | Solution |
|-------|----------|
| SMS delivery slow or failing | Verify number is in "Active" state; check Twilio account balance; contact support for UAE routing issues |
| OTP code not received | Verify phone number format (+971 5X XXX XXXX); check if number is on Do-Not-Disturb or spam filter; retry with voice channel |
| Alphanumeric sender ID not approved | Resubmit with clearer business documentation; contact Twilio support if issues persist |
| Account rate-limited by Twilio | Contact support to increase account limits; implement exponential backoff in backend |
| TRA compliance unclear | Consult with UAE legal team; consider partnering with local SMS provider as fallback |

---

## SendGrid

### Overview

SendGrid is the email service provider for Origin Leasing. All transactional and marketing emails (booking confirmations, receipts, renewals, KYC reminders) are sent through SendGrid with support for English, Arabic, and Chinese templates.

### Prerequisites

- SendGrid account (free tier exists; will upgrade to paid plan)
- Domain ownership: `origin-auto.ae` (DNS access required)
- Email address for contact: origin@origin-auto.ae
- SMTP credentials or API integration planned

### Step-by-Step Instructions

#### 1. Create SendGrid Account

1. Visit [sendgrid.com](https://sendgrid.com)
2. Click **"Sign Up"** and select **"Start Free"**
3. During signup:
   - Company name: `Origin (Shanghai Car Rental LLC)`
   - Use case: `Transactional emails`
   - Country: `United Arab Emirates`
4. Verify email address
5. Create password and complete profile
6. Log into SendGrid dashboard

#### 2. Upgrade to Paid Plan (if not already free tier sufficient)

1. Navigate to **Settings > Billing**
2. Choose a plan:
   - **Free Tier:** Up to 100 emails/day (sufficient for early-stage MVP)
   - **Pro Plan:** Recommended for production; pay-as-you-go at ~USD 10 per 1,000 emails
3. Add credit card and upgrade

#### 3. Verify Domain: origin-auto.ae

Domain verification proves you own the email domain and is critical for deliverability.

1. Navigate to **Settings > Sender Verification > Domain Authentication**
2. Click **"Authenticate Your Domain"**
3. Enter domain: `origin-auto.ae`
4. Select **"Advanced Settings"** (recommended for production)
5. SendGrid generates DNS records to add to your domain:
   - **CNAME for email sending** (e.g., `s1._domainkey.origin-auto.ae → sendgrid.net`)
   - **CNAME for opens/clicks tracking** (e.g., `link.origin-auto.ae → sendgrid.net`)
   - **CNAME for bounce handling** (e.g., `bounce.origin-auto.ae → sendgrid.net`)
6. Add these CNAME records to your domain registrar's DNS settings
7. Return to SendGrid and click **"Verify"**
8. Verification typically completes within 24 hours

#### 4. Add DKIM Signing

DKIM (DomainKeys Identified Mail) adds cryptographic signature to emails, improving trust.

1. In **Settings > Sender Verification > Domain Authentication**
2. After domain is verified, DKIM is automatically enabled
3. Verify DKIM status shows "Verified" (green checkmark)

#### 5. Configure SPF Record

SPF (Sender Policy Framework) tells email servers which IPs are authorized to send from your domain.

1. Add the SPF record to your domain DNS:
   ```
   origin-auto.ae TXT "v=spf1 sendgrid.net ~all"
   ```
2. Wait for DNS propagation (typically 1 hour, up to 24 hours)
3. Test SPF using [mxtoolbox.com](https://mxtoolbox.com) or similar SPF checker

#### 6. Create Dynamic Templates

Dynamic templates allow you to manage content in SendGrid's editor and pass variables from your backend.

##### Template 1: Booking Confirmation (English)

1. Navigate to **Dynamic Templates > Create a New Template**
2. Name: `Booking Confirmation - EN`
3. Create a new version (version 1)
4. Click **"Design"** and use the visual editor or HTML editor
5. Template structure:
   ```
   Subject: {{subject}} — Your booking is confirmed!
   
   Greeting: Hi {{customerName}},
   
   Confirmation Details:
   - Booking Reference: {{bookingId}}
   - Vehicle: {{vehicleBrand}} {{vehicleModel}}
   - Start Date: {{startDate}}
   - End Date: {{endDate}}
   - Duration: {{duration}} days
   - Daily Rate: AED {{dailyRate}} + 5% VAT
   - Total: AED {{totalWithVAT}}
   
   Next Steps:
   1. Complete KYC document upload by {{kycDeadline}}
   2. Final payment due 3 days before lease start
   3. Vehicle will be delivered to your address on {{startDate}}
   
   Questions? Contact us at support@origin-auto.ae or WhatsApp +971 50 123 4567
   ```
6. Save and publish template
7. Copy the **Template ID** (e.g., `d-abc123...`)

##### Template 2: Booking Confirmation (Arabic)

1. Create a new template: `Booking Confirmation - AR`
2. RTL layout: Ensure CSS includes `direction: rtl;` in the body
3. Use Modern Standard Arabic (MSA) for formal content:
   ```
   Subject: {{subject}} — تم تأكيد حجزك!
   
   Greeting: السلام عليكم {{customerName}},
   
   تفاصيل الحجز:
   - رقم المرجع: {{bookingId}}
   - السيارة: {{vehicleBrand}} {{vehicleModel}}
   - تاريخ البدء: {{startDate}}
   - تاريخ الانتهاء: {{endDate}}
   - المدة: {{duration}} يوم
   - السعر اليومي: د.إ {{dailyRate}} + 5% ضريبة
   - الإجمالي: د.إ {{totalWithVAT}}
   ```
4. Save and publish; copy Template ID

##### Template 3: Booking Confirmation (Chinese)

1. Create new template: `Booking Confirmation - ZH`
2. Use Simplified Chinese:
   ```
   Subject: {{subject}} — 您的预订已确认！
   
   Greeting: 尊敬的 {{customerName}}，
   
   预订详情：
   - 预订号：{{bookingId}}
   - 车型：{{vehicleBrand}} {{vehicleModel}}
   - 开始日期：{{startDate}}
   - 结束日期：{{endDate}}
   - 租赁天数：{{duration}} 天
   - 日租价：AED {{dailyRate}} + 5% 增值税
   - 总价：AED {{totalWithVAT}}
   ```
3. Save and publish; copy Template ID

##### Template 4: Payment Receipt

Create similar templates for:
- Payment Receipt (EN/AR/ZH)
- Lease Expiry Reminder (EN/AR/ZH)
- KYC Document Reminder (EN/AR/ZH)
- Welcome Email (EN/AR/ZH)

Store all Template IDs in environment variables (see below).

#### 7. Set Up Dedicated IP (Optional but Recommended for Production)

A dedicated IP improves email deliverability and prevents your emails from being affected by other senders.

1. Navigate to **Settings > IP Management**
2. Select **"Dedicated IP"**
3. Provision a dedicated IP (~USD 30/month)
4. Configure warm-up schedule (SendGrid will ramp your sending gradually to build reputation)
5. Configure IP pools if managing multiple sending identities

#### 8. Configure Bounce and Complaint Handling

1. Navigate to **Settings > Bounce Management**
2. Ensure bounced emails are automatically suppressed from future sends
3. Set up webhook (optional) to track bounces in your database:
   - **Webhook URL:** `https://api.origin-auto.ae/v1/webhooks/sendgrid`
   - **Events:** bounce, complaint, unsubscribe
4. Copy the webhook verification token

### Environment Variables

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@origin-auto.ae
SENDGRID_FROM_NAME=Origin Leasing
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_ZH=d-xxxxx
SENDGRID_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/sendgrid
SENDGRID_WEBHOOK_TOKEN=whvk_xxxxx
SENDGRID_DOMAIN=origin-auto.ae
SENDGRID_SPF_RECORD="v=spf1 sendgrid.net ~all"
```

### Verification & Testing Steps

1. **Domain Verification Test:**
   - Run SPF/DKIM checker on MXToolbox
   - Verify all records pass (SPF, DKIM, DMARC if configured)

2. **Template Rendering Test:**
   - In SendGrid, use the **Test Data** feature in the template editor
   - Provide sample JSON data and preview the rendered email
   - Verify formatting, RTL for Arabic, and special characters for Chinese

3. **Email Delivery Test:**
   - Send a test email from your backend using the API
   - Verify email arrives in inbox (not spam)
   - Check SendGrid dashboard for delivery status

4. **Bounce Handling Test:**
   - Send email to an invalid address (e.g., test@invalid.example.com)
   - Verify bounce is logged in SendGrid dashboard
   - If webhook configured, verify bounce data is posted to your backend

5. **Unsubscribe Test:**
   - Ensure "Unsubscribe" link is present in template
   - Click unsubscribe and verify sender is added to suppression list

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Domain verification pending | Check DNS propagation with `nslookup` or MXToolbox; may take up to 24 hours |
| Emails going to spam | Verify SPF/DKIM/DMARC are configured; use dedicated IP; check sending volume reputation |
| Template variables not rendering | Verify variable names match exactly (case-sensitive); ensure backend JSON matches template placeholders |
| High bounce rate | Review email list for invalid addresses; improve list hygiene before sending |
| Webhook not received | Verify endpoint is publicly accessible; check firewall and CORS settings; test with SendGrid's manual webhook trigger |

---

## WhatsApp Business API

### Overview

WhatsApp is the primary customer communication channel for Origin Leasing in the UAE. The Meta Business Suite integration enables automated booking confirmations, payment reminders, and support notifications in English, Arabic, and Chinese.

### Prerequisites

- Meta Business Account (can create during this process)
- Business verification from Meta (requires business documents)
- UAE phone number (+971 5X XXX XXXX) to register as WhatsApp Business number
- Business profile information (logo, description, address)
- Approval from Meta for message templates

### Step-by-Step Instructions

#### 1. Create Meta Business Account

1. Visit [business.facebook.com](https://business.facebook.com)
2. Click **"Create Account"**
3. Fill in:
   - Business name: `Origin (Shanghai Car Rental LLC)`
   - Your name: [Authorized signatory]
   - Business email: origin@origin-auto.ae
   - Country: `United Arab Emirates`
   - Business type: `Vehicle Rental & Leasing`
4. Accept terms and create account
5. You'll be directed to the Meta Business Suite dashboard

#### 2. Verify Business with Meta

Meta requires business verification before granting WhatsApp API access.

1. In Meta Business Suite, navigate to **Settings > Business Info**
2. Click **"Start Business Verification"**
3. Provide:
   - **Legal business name:** Origin (Shanghai Car Rental LLC)
   - **Business registration number:** [UAE trade license number]
   - **Business address:** [Dubai/Abu Dhabi office]
   - **Authorized representative:** [Name, title, phone, email]
   - **Business documents:** Upload trade license, proof of address
4. Submit for verification. This typically takes 1–3 business days.
5. Meta will email confirmation once verified.

#### 3. Register UAE Phone Number

1. In Meta Business Suite, navigate to **WhatsApp > Phone Numbers**
2. Click **"Add Phone Number"**
3. Enter phone number: `+971 5X XXX XXXX` (the number you purchased for Origin)
4. Verification method: `SMS` or `Call`
5. Receive and enter verification code
6. Phone number is now registered to your business account

#### 4. Set Up WhatsApp Business Profile

The WhatsApp Business Profile is the public-facing identity customers see.

1. Navigate to **WhatsApp > Business Profile** (or in WhatsApp app settings)
2. Configure:
   - **Business Name:** Origin Leasing
   - **Category:** Car Rental & Leasing
   - **Description:** Premium car leasing in Dubai. Short-term and long-term vehicle rental for UAE residents and expats. English, Arabic, Chinese support.
   - **Website:** https://origin-auto.ae
   - **Business Address:** [Dubai office address]
   - **Business Hours:** [e.g., 09:00 – 18:00 GST, 6 days/week]
   - **Profile Picture:** [Upload Origin logo]
   - **Call Button:** Enable (links to phone number +971 50 123 4567)
   - **Message Button:** Enable (customers can message directly)
   - **Email:** support@origin-auto.ae
3. Save and publish profile

#### 5. Create Message Templates

WhatsApp requires pre-approval of all message templates before sending. Templates must be created in English; then translated to Arabic and Chinese.

##### Template 1: Booking Confirmation

**English:**
```
Booking Confirmed!

Hi {{1}},

Your booking is confirmed.

Booking Reference: {{2}}
Vehicle: {{3}} {{4}}
Start Date: {{5}}
End Date: {{6}}
Total: AED {{7}}

Complete KYC by {{8}} to proceed.
Link: {{9}}

Questions? Reply to this message.

Origin Leasing
+971 50 123 4567
```

**Arabic (Modern Standard Arabic):**
```
تم تأكيد الحجز!

السلام عليكم {{1}},

تم تأكيد حجزك بنجاح.

رقم المرجع: {{2}}
السيارة: {{3}} {{4}}
تاريخ البدء: {{5}}
تاريخ الانتهاء: {{6}}
الإجمالي: د.إ {{7}}

أكمل التحقق من الهوية بحلول {{8}}.
الرابط: {{9}}

لديك استفسارات؟ رد على هذه الرسالة.

Origin Leasing
+971 50 123 4567
```

**Chinese (Simplified):**
```
预订已确认！

尊敬的 {{1}},

您的预订已确认。

预订号：{{2}}
车型：{{3}} {{4}}
开始日期：{{5}}
结束日期：{{6}}
总价：AED {{7}}

请在 {{8}} 前完成身份验证。
链接：{{9}}

有任何疑问？请回复此消息。

Origin Leasing
+971 50 123 4567
```

##### Template 2: Payment Reminder

Create similar templates for:
- Payment Due Reminder (EN/AR/ZH)
- Lease Expiry Reminder (EN/AR/ZH)
- KYC Document Reminder (EN/AR/ZH)
- Lease Renewal Offer (EN/AR/ZH)

#### 6. Submit Templates for Meta Approval

1. In Meta Business Suite, navigate to **WhatsApp > Message Templates**
2. For each template:
   - Click **"Create Template"**
   - Select category: `Transactional` (for booking, payments, reminders)
   - Enter template in English
   - Add parameters (marked with `{{1}}`, `{{2}}`, etc.)
   - Submit for approval
3. Repeat for Arabic and Chinese versions
4. Meta typically approves transactional templates within 24 hours
5. Once approved, note the **Template Name** (used in API calls)

#### 7. Configure Webhook for Incoming Messages

WhatsApp will send incoming customer messages to your backend via webhook.

1. In Meta Business Suite, navigate to **App Roles > Apps**
2. Select your app (or create one if needed)
3. Navigate to **Webhooks**
4. Configure:
   - **Webhook URL:** `https://api.origin-auto.ae/v1/webhooks/whatsapp`
   - **Verify Token:** [Generate a secure random string, e.g., `whvk_abc123xyz789`]
   - **Subscribe to events:**
     - `messages` — incoming customer messages
     - `message_status` — delivery, read status
     - `message_template_status_update` — template approval notifications
5. Save webhook configuration
6. Meta will send a GET request to your webhook to verify it; ensure your backend responds with the verify token

#### 8. Get Production API Credentials

1. In Meta Business Suite, navigate to **Settings > Apps and Websites**
2. Find your app and click **Settings**
3. Copy:
   - **App ID:** (visible in App Dashboard)
   - **App Secret:** (visible in App Dashboard)
   - **Phone Number ID:** (visible under WhatsApp > Phone Numbers)
   - **Business Account ID:** (visible under Settings > Business Info)
4. Generate a **Long-Lived Access Token** (recommended over short-lived):
   - Navigate to **Settings > User Access Tokens** (in your personal account settings, not Business Suite)
   - Generate token with `whatsapp_business_messaging` permission
   - Token is valid for ~60 days; refresh periodically

#### 9. Test Webhook Connectivity

1. In your backend, log all incoming webhook requests
2. Manually send a test message from a personal WhatsApp account to the Origin Business number
3. Verify webhook is received and logged in your backend
4. Verify signature validation passes (use App Secret to validate)

### Environment Variables

```bash
META_BUSINESS_ACCOUNT_ID=xxxxxxxxxxxxxxxx
META_APP_ID=xxxxxxxxxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=xxxxxxxxxxxxxxxx
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
META_VERIFY_TOKEN=whvk_abc123xyz789
WHATSAPP_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/whatsapp
WHATSAPP_BUSINESS_PHONE=+97150123456
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_EN=booking_confirmation_en
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_AR=booking_confirmation_ar
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_ZH=booking_confirmation_zh
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_EN=payment_reminder_en
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_AR=payment_reminder_ar
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_ZH=payment_reminder_zh
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_EN=lease_expiry_reminder_en
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_AR=lease_expiry_reminder_ar
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_ZH=lease_expiry_reminder_zh
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_EN=kyc_reminder_en
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_AR=kyc_reminder_ar
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_ZH=kyc_reminder_zh
```

### Verification & Testing Steps

1. **Business Verification Status:**
   - Check Meta Business Suite > Settings > Business Info
   - Verify status shows "Verified" (green checkmark)

2. **Phone Number Registration Test:**
   - Send a test message from your personal WhatsApp to the Origin Business number
   - Verify you can see the business profile and send a message

3. **Template Approval Test:**
   - In Meta Business Suite, check Message Templates
   - Verify all EN/AR/ZH templates show "Approved" status
   - Note Template IDs for backend configuration

4. **Webhook Reception Test:**
   - Send a test message to the Origin Business number
   - In your backend logs, verify webhook is received
   - Log should show customer name, message content, timestamp

5. **Template Sending Test:**
   - From your backend, send a template message to a test phone number
   - Verify message is delivered and rendered correctly in WhatsApp
   - Check for proper parameter substitution and language-specific formatting

6. **Incoming Message Handling Test:**
   - Send a message from a customer phone to the Origin Business number
   - Verify your backend receives the webhook and parses the message
   - Test routing to correct support queue or auto-reply system

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Business verification stuck | Resubmit docs with higher resolution; contact Meta support via Business Suite |
| Templates not approved | Verify templates follow Meta guidelines (no promotional language, clear and concise); resubmit if rejected |
| Webhook not receiving messages | Verify endpoint URL is publicly accessible; check firewall; test webhook trigger manually in Meta settings |
| Template messages failing to send | Verify Template ID is correct; ensure parameter count matches template definition; check account has sufficient messaging quota |
| Message delivery slow | May indicate rate-limiting; stagger sends; contact Meta support for quota increase |
| Arabic/Chinese text rendering incorrectly | Verify UTF-8 encoding in API payload; test with Meta's test message feature first |

---

## Firebase

### Overview

Firebase provides push notifications (FCM for Android, APNs for iOS), real-time database syncing, and analytics for the Origin Leasing mobile app. The production project is `origin-leasing-prod`.

### Prerequisites

- Google Cloud Console account with billing enabled
- Ownership of domain origin-auto.ae (for verification, if needed)
- iOS app identifier: `com.origin.leasing`
- Android app identifier: `com.origin.leasing`
- Apple Developer account (for iOS APNs certificate)
- Google Play Developer account (for Android)

### Step-by-Step Instructions

#### 1. Create Firebase Project

1. Visit [firebase.google.com](https://firebase.google.com) and log in with your Google account
2. Click **"Go to console"**
3. Click **"Create a new project"** or **"Add project"**
4. Project name: `origin-leasing-prod`
5. Enable Google Analytics: **Yes** (for tracking user behavior)
6. Click **"Create project"**
7. Wait for project creation to complete (~5 minutes)

#### 2. Enable Firebase Cloud Messaging (FCM)

FCM is the service that sends push notifications.

1. In Firebase Console, navigate to **Project Settings > Cloud Messaging** (or **Notifications**)
2. Verify **Cloud Messaging API** is enabled (should show a green checkmark)
3. Copy the **Server API Key** (you may see "API Key" or "Legacy Server Key")
4. Note the **Sender ID** (usually displayed on same page)

#### 3. Create and Download Service Account JSON

The service account JSON file allows your backend to send messages and manage Firebase resources.

1. In Firebase Console, click **Project Settings** (gear icon)
2. Navigate to **Service Accounts**
3. Click **"Generate New Private Key"**
4. A JSON file downloads automatically; name it `firebase-service-account.json`
5. **Important:** Treat this file as a secret; never commit it to version control
6. Contents will resemble:
   ```json
   {
     "type": "service_account",
     "project_id": "origin-leasing-prod",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-abc@origin-leasing-prod.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
   }
   ```

#### 4. Configure Android App

##### 4.1 Register Android App in Firebase

1. In Firebase Console, click **"Project Settings"**
2. Under **"Your apps,"** click **Android icon**
3. Fill in:
   - **Package name:** `com.origin.leasing`
   - **App nickname:** Origin Leasing (optional)
   - **Debug signing certificate SHA-1:** [Obtain from Android Studio or `keytool` command]
4. Click **"Register app"**
5. Download **`google-services.json`** file
6. Place this file in your Flutter Android module: `android/app/`

##### 4.2 Obtain SHA-1 Debug Certificate

To get the SHA-1 fingerprint for debug builds:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For production (release signing), obtain the SHA-1 from your release keystore:

```bash
keytool -list -v -keystore /path/to/release.keystore -alias release -storepass [password] -keypass [password]
```

#### 5. Configure iOS App

##### 5.1 Register iOS App in Firebase

1. In Firebase Console, click **"Project Settings"**
2. Under **"Your apps,"** click **iOS icon**
3. Fill in:
   - **Bundle ID:** `com.origin.leasing`
   - **App nickname:** Origin Leasing (optional)
   - **App Store ID:** [Leave blank for now; fill when app is published]
4. Click **"Register app"**
5. Download **`GoogleService-Info.plist`** file
6. Add to your Flutter iOS module: `ios/Runner/`
   - In Xcode, drag the file into the Runner project
   - Ensure it's added to all targets (Runner app target)

##### 5.2 Set Up APNs (Apple Push Notification) Certificate

APNs is required for iOS push notifications.

1. In Apple Developer Portal ([developer.apple.com](https://developer.apple.com)), go to **Certificates, IDs & Profiles**
2. Navigate to **Keys**
3. Click **"Create a new key"** (or use existing)
4. Select **APNs** as key type
5. Download the `.p8` file (Apple Push Notification Key)
6. In Firebase Console, navigate to **Project Settings > Cloud Messaging > iOS**
7. Upload the `.p8` file
8. Enter:
   - **Key ID:** (from Apple Developer Portal)
   - **Team ID:** (from Apple Developer Portal, under Account > Membership)
9. Click **"Upload"**

#### 6. Enable Realtime Database (Optional)

If using Firebase Realtime Database for booking status updates:

1. In Firebase Console, navigate to **Build > Realtime Database**
2. Click **"Create Database"**
3. Choose region: **Asia (region depends on nearest to UAE; consider `asia-northeast1` for Tokyo or `asia-southeast1` for Singapore)**
4. Select **"Start in test mode"** (can be changed later; production rules should restrict access by authentication)
5. Create database

#### 7. Set Up Firestore (Optional)

For cloud-based document storage (customer profiles, bookings):

1. In Firebase Console, navigate to **Build > Firestore Database**
2. Click **"Create database"**
3. Choose region (same as above; Asia region recommended)
4. Select **"Start in test mode"**
5. Create database

#### 8. Enable Analytics (Already Enabled)

1. Firebase Analytics is automatically enabled for the project
2. You can customize event tracking in your app (e.g., booking started, payment completed)
3. Track custom events in Flutter:
   ```dart
   FirebaseAnalytics.instance.logEvent(
     name: 'booking_started',
     parameters: {
       'vehicle_brand': 'BYD',
       'duration_days': 7,
     },
   );
   ```

### Environment Variables

```bash
FIREBASE_PROJECT_ID=origin-leasing-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc@origin-leasing-prod.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_SENDER_ID=xxxxx
FIREBASE_DATABASE_URL=https://origin-leasing-prod.firebaseio.com
FIREBASE_STORAGE_BUCKET=origin-leasing-prod.appspot.com
ANDROID_PACKAGE_NAME=com.origin.leasing
iOS_BUNDLE_ID=com.origin.leasing
APPLE_TEAM_ID=XXXXX
APPLE_KEY_ID=XXXXX
APPLE_APN_KEY_PATH=/path/to/AuthKey_XXXXX.p8
```

### Verification & Testing Steps

1. **Service Account JSON Validation:**
   - Verify the JSON file can be parsed without errors
   - Test authentication using NestJS Firebase Admin SDK

2. **Android Push Notification Test:**
   - Build and run Android app with FCM enabled
   - Obtain FCM token from app logs
   - Send test notification via Firebase Console:
     - Navigate to **Engage > Messaging**
     - Click **"New campaign"**
     - Create a test notification
     - Send to specific device/FCM token
   - Verify notification appears on Android device

3. **iOS Push Notification Test:**
   - Build and run iOS app (must be on physical device or simulator with APNs support)
   - Obtain FCM token from app logs
   - Send test notification via Firebase Console (same as above)
   - Verify notification appears on iOS device

4. **Backend Notification Sending Test:**
   - In NestJS backend, use Firebase Admin SDK to send message to FCM token
   - Verify message delivery and rendering on mobile devices

5. **Realtime Database Test (if enabled):**
   - Write test data to Realtime Database from Firebase Console
   - Verify app receives real-time updates

6. **Analytics Test:**
   - Log custom events from app (booking_started, payment_completed)
   - Check Firebase Console > Analytics to see events ingested

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Service account JSON missing | Regenerate in Firebase Console > Project Settings > Service Accounts |
| APNs certificate upload fails | Verify `.p8` file format and expiration; regenerate from Apple Developer Portal if needed |
| FCM token not generated on app startup | Verify `GoogleService-Info.plist` (iOS) or `google-services.json` (Android) is correctly placed; check app permissions |
| Push notifications not delivering | Verify FCM token is current (may expire); check app is in foreground/background correctly; test with Firebase Console's "Send test message" |
| iOS notifications silent | Verify APNs certificate is uploaded and valid; check notification payload includes `alert` and `sound` fields |
| High notification latency | May indicate Firebase region is far from users; consider regional sharding if needed |

---

## Tabby

### Overview

Tabby is the Buy-Now-Pay-Later (BNPL) provider for Origin Leasing, allowing customers to split lease payments into installments without upfront interest. This service is optional but improves conversion rates in the UAE market.

### Prerequisites

- Business registration documents for Origin (Shanghai Car Rental LLC)
- UAE trade license and business address
- Bank account for payouts (AED-denominated)
- Estimated monthly lease volume (AED)

### Step-by-Step Instructions

#### 1. Merchant Onboarding

1. Visit [Tabby for merchants](https://tabby.ai/for-business) or contact sales@tabby.ai
2. Click **"Get Started"** or **"Apply Now"**
3. You'll be directed to a merchant onboarding form:
   - **Business name:** Origin (Shanghai Car Rental LLC)
   - **Business category:** Vehicle Rental & Leasing
   - **Country:** United Arab Emirates
   - **Business registration number:** [UAE trade license]
   - **Business address:** [Dubai/Abu Dhabi office]
   - **Contact person:** [Name, email, phone]
   - **Expected monthly GMV (Gross Merchandise Volume):** [AED estimate]
   - **Bank account for payouts:** [IBAN, account holder name]
4. Submit form for review

#### 2. Submit Business Documentation

Tabby will request verification documents:

1. **Trade License:** High-resolution color scan (current and valid)
2. **Proof of Address:** Utility bill, business lease, or property registration
3. **Beneficial Owners:** Passport copies of owners with >25% stake
4. **Bank Statement:** Last 3 months showing business activity
5. Upload documents through the portal or email to merchant@tabby.ai
6. Tabby typically approves within 2–3 business days

#### 3. Obtain Production API Key

1. Once onboarded, log into Tabby Merchant Portal ([merchants.tabby.ai](https://merchants.tabby.ai))
2. Navigate to **Settings > API Keys**
3. You'll see:
   - **Live API Key** — for production transactions
   - **Test API Key** — for development
4. Copy the **Live API Key** and store securely
5. Also note the **Public Key** (used in frontend for tokenization)

#### 4. Integrate Tabby Widget into Checkout

The Tabby widget allows customers to see BNPL options at checkout.

1. In your Next.js frontend (`pages/checkout.tsx` or similar):
   ```jsx
   import { TabbyCheckout } from '@tabby/react';

   export default function CheckoutPage() {
     const [tabbyCheckoutAvailable, setTabbyCheckoutAvailable] = useState(false);

     useEffect(() => {
       // Check if Tabby is available in UAE
       fetch('https://api.tabby.ai/checkout/v0/session', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           public_key: process.env.REACT_APP_TABBY_PUBLIC_KEY,
           amount: totalPrice,
           currency: 'AED',
         }),
       })
         .then(res => res.json())
         .then(data => setTabbyCheckoutAvailable(!!data.sessionId))
         .catch(() => setTabbyCheckoutAvailable(false));
     }, [totalPrice]);

     return (
       <div>
         {/* Existing checkout form */}
         {tabbyCheckoutAvailable && (
           <TabbyCheckout
             sessionId={sessionId}
             onSuccess={handleTabbySuccess}
             onError={handleTabbyError}
           />
         )}
       </div>
     );
   }
   ```

2. The widget displays BNPL options if the customer is eligible (typically 4 installments over 8 weeks)

#### 5. Configure Currency and Settlement

1. In Tabby Merchant Portal, navigate to **Settings > Currency**
2. Verify default currency is set to **AED**
3. Configure settlement details:
   - **Settlement currency:** AED
   - **Payout frequency:** Daily or weekly
   - **Bank account:** IBAN and account holder name already submitted during onboarding
4. Save configuration

#### 6. Set Up Payment Status Webhooks

Tabby sends webhooks for payment status updates (authorized, captured, failed).

1. In Tabby Merchant Portal, navigate to **Settings > Webhooks**
2. Add webhook endpoint:
   - **URL:** `https://api.origin-auto.ae/v1/webhooks/tabby`
   - **Events:** `payment.authorized`, `payment.captured`, `payment.declined`, `payment.cancelled`
3. Copy the **Webhook Secret** (for signature validation)
4. Test webhook by triggering a manual test event in the portal

#### 7. Submit for Production Approval

1. Ensure all documentation is uploaded and verified
2. In Merchant Portal, navigate to **Settings > Account Status**
3. Click **"Ready for Production"** (or similar)
4. Tabby's team will conduct a final review (typically 1 business day)
5. Once approved, your account is live for real transactions

### Environment Variables

```bash
TABBY_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx
TABBY_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
TABBY_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxxxxx
TABBY_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/tabby
TABBY_CURRENCY=AED
TABBY_ENVIRONMENT=live
TABBY_API_BASE_URL=https://api.tabby.ai
```

### Verification & Testing Steps

1. **API Key Validation:**
   - Test API key connectivity by making a test session request
   - Verify response returns a valid session ID

2. **Widget Display Test:**
   - In your checkout page, verify Tabby widget appears for eligible customers
   - Verify widget displays 4 BNPL installment option

3. **BNPL Transaction Test:**
   - Complete a checkout with Tabby selected
   - Verify transaction appears in Tabby Merchant Portal with "Authorized" status
   - Verify funds are scheduled for payout (typically next business day)

4. **Webhook Reception Test:**
   - Process a test BNPL transaction
   - Verify webhook is received by your backend
   - Verify payment status is updated in your booking record

5. **Settlement Verification:**
   - Monitor Tabby Merchant Portal for payout schedule
   - Verify funds arrive in Origin's bank account within expected timeframe

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Onboarding approval delayed | Resubmit documentation with higher quality scans; contact Tabby merchant support |
| Widget not displaying | Verify public key is correct; check customer eligibility in their region; verify cart total meets Tabby minimum |
| BNPL transaction declined | Check customer credit profile in Tabby system; may be ineligible due to credit limits or payment history |
| Webhook not received | Verify endpoint URL is publicly accessible; check firewall; test webhook trigger manually in Merchant Portal |
| Settlement delayed | Contact Tabby support; may indicate compliance review or bank processing delay |
| Currency mismatch | Verify environment variable `TABBY_CURRENCY=AED`; ensure all amounts sent to Tabby API are in AED |

---

## Google Maps Platform

### Overview

Google Maps integration provides location selection (pickup/drop-off), fleet tracking, and distance calculations for Origin Leasing customers and operations.

### Prerequisites

- Google Cloud Console account with billing enabled
- Credit card for billing (will be charged for API usage)
- Project ID for the Leasing platform

### Step-by-Step Instructions

#### 1. Create Google Cloud Project

1. Visit [console.cloud.google.com](https://console.cloud.google.com)
2. Click **"Select a Project"** → **"New Project"**
3. Project name: `Origin Leasing Production`
4. Organization (optional): Leave blank or select your organization if available
5. Click **"Create"**
6. Wait for project to initialize

#### 2. Enable Required APIs

1. In Google Cloud Console, navigate to **APIs & Services > Library**
2. Search for and enable each API:

   **API 1: Places API**
   - Search "Places API"
   - Click **"Enable"**
   - This allows searching for locations (pickup/drop-off points)

   **API 2: Geocoding API**
   - Search "Geocoding API"
   - Click **"Enable"**
   - This converts addresses to coordinates and vice versa

   **API 3: Distance Matrix API**
   - Search "Distance Matrix API"
   - Click **"Enable"**
   - This calculates distances and travel times between locations

   **API 4: Maps JavaScript API** (for frontend map display)
   - Search "Maps JavaScript API"
   - Click **"Enable"**
   - This embeds interactive maps in your website

3. Verify all four APIs show "Enabled" under **APIs & Services > Enabled APIs & Services**

#### 3. Create API Key

1. Navigate to **APIs & Services > Credentials**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the generated API key (e.g., `AIzaSyD...`)
4. Note: This is your **unrestricted key**; we'll restrict it next

#### 4. Create Server API Key (for Backend)

1. In **Credentials**, click **"Create Credentials"** → **"API Key"** again
2. Click on the newly created key to edit it
3. Rename: `origin-leasing-backend-key`
4. Under **Restrictions**, select **API restrictions**:
   - Restrict to:
     - Places API
     - Geocoding API
     - Distance Matrix API
5. Save this key for NestJS backend environment variables

#### 5. Create Web API Key (for Frontend)

1. Create another API key
2. Rename: `origin-leasing-frontend-key`
3. Under **Key restrictions**, select **HTTP referrers (web sites)**
4. Add allowed HTTP referrers:
   ```
   https://origin-auto.ae/*
   https://www.origin-auto.ae/*
   https://*.origin-auto.ae/*
   ```
5. Under **API restrictions**, restrict to:
   - Maps JavaScript API
   - Places API (for autocomplete)
6. Save for Next.js frontend environment variables

#### 6. Create Mobile API Key (for Flutter App)

1. Create another API key
2. Rename: `origin-leasing-mobile-key`
3. Under **Key restrictions**, select **Android apps** and **iOS apps**
4. For **Android**:
   - Add your app's package name: `com.origin.leasing`
   - Add your app's SHA-1 fingerprint (from signing certificate)
5. For **iOS**:
   - Add your app's Bundle ID: `com.origin.leasing`
6. Under **API restrictions**, restrict to:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Geocoding API
   - Distance Matrix API
7. Save for Flutter mobile app environment variables

#### 7. Set Up Billing

1. Navigate to **Billing** in Google Cloud Console
2. Click **"Create Billing Account"**
3. Enter billing information:
   - **Account name:** Origin Leasing
   - **Billing country:** United Arab Emirates
   - **Credit card:** Visa/MasterCard for payment
4. Confirm and activate billing account
5. Link the billing account to your project:
   - In **Project Settings**, select the billing account

#### 8. Configure Quotas and Usage Limits

To prevent runaway charges, set up daily quota limits.

1. Navigate to **APIs & Services > Quotas**
2. For each API, find and configure:
   - **Geocoding API:** Set to ~10,000 requests/day
   - **Distance Matrix API:** Set to ~5,000 requests/day
   - **Places API:** Set to ~20,000 requests/day
3. Click on each quota and set **daily request limit** to prevent unexpected charges
4. Set up billing alerts:
   - Navigate to **Billing > Budgets and Alerts**
   - Click **"Create Budget"**
   - Set budget amount: ~AED 500/month (~USD 136)
   - Set alert threshold: 80% and 100%

#### 9. Verify IP Restrictions (Backend Security)

Ensure your NestJS backend IP is allowed (if running from static IP):

1. In **Credentials**, edit the backend API key
2. Under **Application restrictions**, select **IP addresses**
3. Add your backend server's public IP (if static)
4. This prevents unauthorized use of your API key

### Environment Variables

```bash
# Backend (NestJS)
GOOGLE_MAPS_API_KEY_BACKEND=AIzaSyD...
GOOGLE_MAPS_API_KEY_BACKEND_NAME=origin-leasing-backend-key
GOOGLE_PLACES_API_KEY=AIzaSyD...
GOOGLE_GEOCODING_API_KEY=AIzaSyD...
GOOGLE_DISTANCE_MATRIX_API_KEY=AIzaSyD...

# Frontend (Next.js)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_NAME=origin-leasing-frontend-key

# Mobile (Flutter)
FLUTTER_GOOGLE_MAPS_API_KEY=AIzaSyD...
FLUTTER_GOOGLE_MAPS_API_KEY_NAME=origin-leasing-mobile-key

# Configuration
GOOGLE_MAPS_REGION=ae
GOOGLE_MAPS_LANGUAGE=en
GOOGLE_CLOUD_PROJECT_ID=origin-leasing-production
```

### Verification & Testing Steps

1. **API Key Validation:**
   - Test each API key with a simple request
   - Verify key restrictions are working (e.g., backend key fails on frontend domain)

2. **Geocoding Test:**
   - Submit address: "Dubai Mall, Dubai, United Arab Emirates"
   - Verify lat/lng is returned correctly

3. **Distance Matrix Test:**
   - Calculate distance between two Dubai locations
   - Verify distance and duration are reasonable

4. **Places API Test:**
   - Search for "car rental, Dubai"
   - Verify results return relevant businesses

5. **Maps JavaScript API Test:**
   - Embed map in Next.js page
   - Verify map displays and is interactive

6. **Android/iOS Geocoding Test:**
   - From Flutter app, call Google Maps API
   - Verify API key restrictions allow mobile app

7. **Quota/Billing Test:**
   - Monitor **Quotas** page for real-time request counts
   - Verify billing dashboard shows projected costs

### Troubleshooting

| Issue | Solution |
|-------|----------|
| API returns 403 Forbidden | Verify API key is correct; check IP restrictions if backend key; verify API is enabled |
| Requests return 400 Bad Request | Check request format (coordinates must be valid; addresses must include country) |
| High API costs | Implement caching of geocoding results; reduce Distance Matrix calls with client-side estimates; review quotas |
| Billing alert not received | Verify email address in alert notification settings; check spam folder |
| Maps not displaying | Verify API key is frontend key (not backend key); check Maps JavaScript API is enabled |
| Mobile app GPS not working | Verify app has location permission (iOS/Android); verify Google Maps SDK is correctly integrated in Flutter |

---

## Environment Variables Checklist

Below is a comprehensive list of all environment variables required across the Origin Leasing platform. Copy this section and use it as a setup checklist.

### Checkout.com (Payment Processing)

```bash
CHECKOUT_PUBLIC_KEY_LIVE=pk_live_xxxxx
CHECKOUT_SECRET_KEY_LIVE=sk_live_xxxxx
CHECKOUT_WEBHOOK_SECRET=whsk_xxxxx
CHECKOUT_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/checkout
CHECKOUT_CURRENCY=AED
CHECKOUT_ENVIRONMENT=live
```

### Twilio (SMS & OTP)

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+971501234567
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SENDER_ID=Origin
TWILIO_REGION=ae
```

### SendGrid (Email)

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@origin-auto.ae
SENDGRID_FROM_NAME=Origin Leasing
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_BOOKING_CONFIRMATION_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_PAYMENT_RECEIPT_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_KYC_REMINDER_ZH=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_EN=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_AR=d-xxxxx
SENDGRID_TEMPLATE_ID_WELCOME_ZH=d-xxxxx
SENDGRID_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/sendgrid
SENDGRID_WEBHOOK_TOKEN=whvk_xxxxx
SENDGRID_DOMAIN=origin-auto.ae
SENDGRID_SPF_RECORD="v=spf1 sendgrid.net ~all"
```

### WhatsApp Business API

```bash
META_BUSINESS_ACCOUNT_ID=xxxxxxxxxxxxxxxx
META_APP_ID=xxxxxxxxxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=xxxxxxxxxxxxxxxx
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
META_VERIFY_TOKEN=whvk_abc123xyz789
WHATSAPP_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/whatsapp
WHATSAPP_BUSINESS_PHONE=+97150123456
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_EN=booking_confirmation_en
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_AR=booking_confirmation_ar
WHATSAPP_TEMPLATE_ID_BOOKING_CONFIRMATION_ZH=booking_confirmation_zh
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_EN=payment_reminder_en
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_AR=payment_reminder_ar
WHATSAPP_TEMPLATE_ID_PAYMENT_REMINDER_ZH=payment_reminder_zh
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_EN=lease_expiry_reminder_en
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_AR=lease_expiry_reminder_ar
WHATSAPP_TEMPLATE_ID_LEASE_EXPIRY_REMINDER_ZH=lease_expiry_reminder_zh
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_EN=kyc_reminder_en
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_AR=kyc_reminder_ar
WHATSAPP_TEMPLATE_ID_KYC_REMINDER_ZH=kyc_reminder_zh
```

### Firebase (Push Notifications & Analytics)

```bash
FIREBASE_PROJECT_ID=origin-leasing-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc@origin-leasing-prod.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_SENDER_ID=xxxxx
FIREBASE_DATABASE_URL=https://origin-leasing-prod.firebaseio.com
FIREBASE_STORAGE_BUCKET=origin-leasing-prod.appspot.com
ANDROID_PACKAGE_NAME=com.origin.leasing
iOS_BUNDLE_ID=com.origin.leasing
APPLE_TEAM_ID=XXXXX
APPLE_KEY_ID=XXXXX
APPLE_APN_KEY_PATH=/path/to/AuthKey_XXXXX.p8
```

### Tabby (Buy-Now-Pay-Later)

```bash
TABBY_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx
TABBY_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
TABBY_WEBHOOK_SECRET=whsk_xxxxxxxxxxxxxxxx
TABBY_WEBHOOK_URL=https://api.origin-auto.ae/v1/webhooks/tabby
TABBY_CURRENCY=AED
TABBY_ENVIRONMENT=live
TABBY_API_BASE_URL=https://api.tabby.ai
```

### Google Maps Platform

```bash
# Backend (NestJS)
GOOGLE_MAPS_API_KEY_BACKEND=AIzaSyD...
GOOGLE_MAPS_API_KEY_BACKEND_NAME=origin-leasing-backend-key
GOOGLE_PLACES_API_KEY=AIzaSyD...
GOOGLE_GEOCODING_API_KEY=AIzaSyD...
GOOGLE_DISTANCE_MATRIX_API_KEY=AIzaSyD...

# Frontend (Next.js)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_NAME=origin-leasing-frontend-key

# Mobile (Flutter)
FLUTTER_GOOGLE_MAPS_API_KEY=AIzaSyD...
FLUTTER_GOOGLE_MAPS_API_KEY_NAME=origin-leasing-mobile-key

# Configuration
GOOGLE_MAPS_REGION=ae
GOOGLE_MAPS_LANGUAGE=en
GOOGLE_CLOUD_PROJECT_ID=origin-leasing-production
```

### Additional Recommended Variables

```bash
# Application Configuration
NODE_ENV=production
ENVIRONMENT=production
LOG_LEVEL=info

# Database (NestJS backend)
DATABASE_URL=postgresql://user:password@localhost:5432/origin_leasing
DATABASE_SSL=true

# Backend API
API_BASE_URL=https://api.origin-auto.ae
API_PORT=3000

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://api.origin-auto.ae
NEXT_PUBLIC_APP_URL=https://origin-auto.ae

# Security & Encryption
JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=your_encryption_key_here
WEBHOOK_SIGNATURE_SECRET=your_webhook_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15000
RATE_LIMIT_MAX_REQUESTS=100

# Compliance & Logging
AUDIT_LOG_ENABLED=true
COMPLIANCE_MODE=true
DATA_RETENTION_DAYS=2555
```

---

## Notes & Best Practices

1. **Secret Management:**
   - Never commit `.env` files or API keys to version control
   - Use a secrets manager (AWS Secrets Manager, Azure Key Vault, or Vault)
   - Rotate API keys annually
   - Audit key usage regularly

2. **Redundancy & Failover:**
   - Have backup payment processors (e.g., Tabby if Checkout.com fails)
   - Implement retry logic with exponential backoff for all API calls
   - Log all API failures for debugging

3. **Monitoring & Alerts:**
   - Monitor API error rates and latency
   - Set up alerts for webhook failures (payment, SMS, email)
   - Track spending on each service monthly

4. **Compliance:**
   - Ensure all customer data is encrypted in transit (TLS) and at rest
   - Log all transactions for UAE regulatory compliance
   - Keep audit trails of automated messages (WhatsApp, SMS, email)
   - Review data privacy policies quarterly

5. **Testing:**
   - Always test integrations in sandbox/test mode before going live
   - Use test credentials and test payment cards provided by each service
   - Involve QA team in end-to-end testing of payment, notification, and location flows

6. **Documentation:**
   - Keep this guide updated as services change
   - Document any custom API extensions or middleware
   - Maintain a runbook for handling service outages

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-31 | Initial production integration guide for Origin Leasing |

---

**Prepared for:** Origin (Shanghai Car Rental LLC)  
**Domain:** origin-auto.ae  
**Region:** Dubai, UAE  
**Tech Stack:** NestJS | Next.js | Flutter