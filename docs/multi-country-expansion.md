# Multi-Country Expansion Architecture Plan

**Origin Car Leasing — Shanghai Car Rental LLC (Abu Dhabi)**

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-03-31 |
| Status | Draft |
| Expansion Path | UAE → GCC (Saudi, Qatar, Bahrain, Kuwait, Oman) → Egypt |

---

## Table of Contents

1. [Current State — UAE-Hardcoded Dependencies](#1-current-state--uae-hardcoded-dependencies)
2. [Architecture Changes](#2-architecture-changes)
3. [Per-Country Regulatory Overview](#3-per-country-regulatory-overview)
4. [Language Requirements](#4-language-requirements)
5. [Payment Provider Matrix](#5-payment-provider-matrix)
6. [Recommended Expansion Order](#6-recommended-expansion-order)
7. [Estimated Effort](#7-estimated-effort)

---

## 1. Current State — UAE-Hardcoded Dependencies

The Origin platform was built for a single-country deployment (UAE / Abu Dhabi). The following items are currently hardcoded or tightly coupled to UAE assumptions and must be abstracted before any expansion.

### 1.1 Currency

- **AED (د.إ)** is hardcoded throughout the frontend (website, mobile app, admin dashboard) and backend (Prisma schema, API responses, lease calculator).
- All pricing, invoices, deposit amounts, and BNPL instalments assume AED.
- The lease calculator divides annual cost by 12 with AED formatting — no currency conversion or multi-currency awareness exists.

### 1.2 Tax / VAT

- **5% VAT** is applied as a constant in the booking flow, invoice generation, and lease calculator.
- VAT is not configurable per country or per product category.
- No tax engine exists — the rate is a magic number in multiple locations (`website/`, `backend/`, `admin/`).

### 1.3 Phone Numbers

- Phone validation assumes the **+971** prefix and UAE mobile format (`+971 5X XXX XXXX`).
- OTP authentication via Twilio is configured for UAE numbers only.
- No country code selector exists in the UI.

### 1.4 KYC / Document Requirements

- The booking flow requests: Emirates ID, UAE driving licence, visa copy, passport copy.
- These are UAE-specific documents — Saudi residents have Iqama + Saudi driving licence, Egypt has National ID, etc.
- Document upload labels and validation are hardcoded in English/Arabic/Chinese but only for UAE document types.

### 1.5 Payment Providers

- **Checkout.com** is integrated as the sole card payment processor (configured for AED).
- **Tabby** is integrated as the sole BNPL provider (UAE focus, expanding to Saudi/Kuwait).
- No payment provider abstraction layer exists — Checkout.com and Tabby API calls are made directly from service classes.

### 1.6 Regulatory References

- RTA (Roads and Transport Authority) compliance badges and references are hardcoded in the footer and about page.
- The company licence shown is the Abu Dhabi ADRA licence — no support for displaying different licences per emirate or country.
- Insurance partner references are UAE-specific.

### 1.7 Integrations

- **WhatsApp Business API** — single number configured (+971 prefix).
- **Google Maps** — region bias set to UAE (`region=ae`).
- **Firebase** — single project, no country-based topic segmentation.

---

## 2. Architecture Changes

### 2.1 Country Configuration System

Introduce a `country_config` table and corresponding service that centralises all country-specific settings. Every country-dependent decision in the platform reads from this config rather than hardcoded values.

```
Table: country_config
─────────────────────────────────────────────────────────
country_code        VARCHAR(2)  PK   -- ISO 3166-1 (AE, SA, QA, BH, KW, OM, EG)
country_name_en     VARCHAR(100)
country_name_ar     VARCHAR(100)
currency_code       VARCHAR(3)       -- AED, SAR, QAR, BHD, KWD, OMR, EGP
currency_symbol     VARCHAR(10)      -- د.إ, ر.س, ر.ق, .د.ب, د.ك, ر.ع., ج.م
vat_rate            DECIMAL(5,2)     -- 5.00, 15.00, 0.00, 10.00, 0.00, 0.00, 5.00, 14.00
phone_prefix        VARCHAR(5)       -- +971, +966, +974, +973, +965, +968, +20
phone_format        VARCHAR(50)      -- regex pattern for validation
default_language    VARCHAR(5)       -- en, ar
supported_languages JSONB            -- ["en","ar","zh-CN"] for UAE, ["en","ar"] for others
timezone            VARCHAR(50)      -- Asia/Dubai, Asia/Riyadh, etc.
kyc_documents       JSONB            -- list of required document types per country
payment_providers   JSONB            -- enabled providers and their config keys
regulatory_body     VARCHAR(200)     -- display name of transport authority
licence_number      VARCHAR(100)     -- company licence number for that country
whatsapp_number     VARCHAR(20)      -- country-specific WhatsApp Business number
maps_region_bias    VARCHAR(2)       -- ae, sa, qa, bh, kw, om, eg
is_active           BOOLEAN          -- feature flag to enable/disable country
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Implementation pattern:**

```typescript
// backend/src/config/country.service.ts
@Injectable()
export class CountryConfigService {
  async getConfig(countryCode: string): Promise<CountryConfig> { ... }
  async getActiveCountries(): Promise<CountryConfig[]> { ... }
  async getTaxRate(countryCode: string): Promise<number> { ... }
  async getPaymentProviders(countryCode: string): Promise<PaymentProvider[]> { ... }
  async getKycRequirements(countryCode: string): Promise<KycDocument[]> { ... }
}
```

### 2.2 Database — Shared DB with `country_code`

Rather than separate databases per country (expensive, hard to manage), use a **single shared database** with `country_code` as a discriminator on all major tables.

**Tables requiring `country_code` column:**

| Table | Notes |
|---|---|
| `vehicles` | Fleet is country-specific; a car in Dubai is not bookable from Riyadh |
| `bookings` | Tied to country for tax, currency, and regulatory compliance |
| `leases` | Country determines contract template, tax, and payment terms |
| `customers` | A customer may exist in multiple countries (use `customer_country_profiles`) |
| `payments` | Currency and provider vary by country |
| `invoices` | Tax rate, currency, regulatory references vary |
| `documents` | KYC document types differ per country |

**Cross-country customers:** Create a `customer_country_profiles` junction table so a single customer account (identified by phone or email) can have country-specific KYC documents, payment methods, and lease histories.

```
Table: customer_country_profiles
─────────────────────────────────────────────────────────
id                  UUID PK
customer_id         UUID FK → customers
country_code        VARCHAR(2) FK → country_config
kyc_status          ENUM (pending, verified, rejected)
local_id_number     VARCHAR(100)  -- Emirates ID / Iqama / National ID
local_licence_no    VARCHAR(100)
created_at          TIMESTAMP
UNIQUE(customer_id, country_code)
```

**Row-Level Security (RLS):** If using PostgreSQL, implement RLS policies so that API requests scoped to a country can only see rows matching that `country_code`. This prevents accidental cross-country data leaks and simplifies query logic.

### 2.3 Currency Handling

**Principles:**
- Store all monetary values as **integers in the smallest currency unit** (fils, halalas, piastres) to avoid floating-point errors.
- Store the `currency_code` alongside every monetary value in the DB.
- Format for display using a shared utility that reads country config.

| Country | Currency | Code | Subunit | Decimal Places |
|---|---|---|---|---|
| UAE | Dirham | AED | Fils | 2 |
| Saudi Arabia | Riyal | SAR | Halala | 2 |
| Qatar | Riyal | QAR | Dirham | 2 |
| Bahrain | Dinar | BHD | Fils | **3** |
| Kuwait | Dinar | KWD | Fils | **3** |
| Oman | Rial | OMR | Baisa | **3** |
| Egypt | Pound | EGP | Piastre | 2 |

> **Warning:** BHD, KWD, and OMR use **3 decimal places**, not 2. This affects all formatting, rounding, and payment gateway amount fields. Checkout.com expects amounts in smallest currency unit — ensure the multiplier is 1000 for 3-decimal currencies, not 100.

**Frontend utility:**

```typescript
function formatCurrency(amountMinor: number, currencyCode: string): string {
  const decimals = ['BHD', 'KWD', 'OMR'].includes(currencyCode) ? 3 : 2;
  const amount = amountMinor / Math.pow(10, decimals);
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
  }).format(amount);
}
```

### 2.4 Tax Engine

Replace all hardcoded VAT references with a tax engine that calculates based on country config.

| Country | VAT Rate | Notes |
|---|---|---|
| UAE | 5% | Federal VAT since 2018. Must be itemised on invoices. TRN required. |
| Saudi Arabia | 15% | Increased from 5% to 15% in July 2020. ZATCA (Zakat, Tax and Customs Authority) compliance required, including e-invoicing (FATOORAH). |
| Qatar | 0% | No VAT currently. Monitor — GCC VAT framework agreed but Qatar has not implemented. |
| Bahrain | 10% | Increased from 5% to 10% in January 2022. NBR (National Bureau for Revenue) compliance. |
| Kuwait | 0% | No VAT currently. Implementation has been repeatedly delayed. |
| Oman | 5% | Implemented April 2021. Oman Tax Authority compliance. |
| Egypt | 14% | Standard rate under Law 67/2016. Egyptian Tax Authority (ETA) e-invoicing mandate. |

**Tax service:**

```typescript
@Injectable()
export class TaxService {
  async calculateTax(
    amountMinor: number,
    countryCode: string,
    category?: string
  ): Promise<{ net: number; tax: number; gross: number; rate: number }> {
    const config = await this.countryConfigService.getConfig(countryCode);
    const rate = config.vat_rate / 100;
    const tax = Math.round(amountMinor * rate);
    return {
      net: amountMinor,
      tax,
      gross: amountMinor + tax,
      rate: config.vat_rate,
    };
  }
}
```

**E-invoicing requirements:** Saudi Arabia (ZATCA Phase 2 — integration phase) and Egypt (ETA) mandate electronic invoice submission to government systems. The tax engine must support generating compliant XML/JSON invoice payloads for these countries.

### 2.5 Phone Validation

Replace the hardcoded +971 validation with a country-aware phone input.

```typescript
const PHONE_PATTERNS: Record<string, { prefix: string; regex: RegExp; example: string }> = {
  AE: { prefix: '+971', regex: /^\+971[0-9]{9}$/, example: '+971 5X XXX XXXX' },
  SA: { prefix: '+966', regex: /^\+966[0-9]{9}$/, example: '+966 5X XXX XXXX' },
  QA: { prefix: '+974', regex: /^\+974[0-9]{8}$/, example: '+974 XXXX XXXX' },
  BH: { prefix: '+973', regex: /^\+973[0-9]{8}$/, example: '+973 XXXX XXXX' },
  KW: { prefix: '+965', regex: /^\+965[0-9]{8}$/, example: '+965 XXXX XXXX' },
  OM: { prefix: '+968', regex: /^\+968[0-9]{8}$/, example: '+968 XXXX XXXX' },
  EG: { prefix: '+20',  regex: /^\+20[0-9]{10}$/, example: '+20 1X XXXX XXXX' },
};
```

Use a UI component with a country flag dropdown that auto-selects based on the user's chosen country context.

### 2.6 Payment Provider Abstraction

Introduce a **PaymentProviderFactory** pattern so the backend selects the correct payment provider based on country config.

```typescript
interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata: object): Promise<PaymentIntent>;
  processRefund(paymentId: string, amount: number): Promise<Refund>;
  getInstallmentOptions?(amount: number, currency: string): Promise<InstallmentPlan[]>;
}

@Injectable()
class PaymentProviderFactory {
  getProvider(countryCode: string, type: 'card' | 'bnpl'): PaymentProvider {
    const config = this.countryConfigService.getPaymentProviders(countryCode);
    // Returns CheckoutComProvider, PaymobProvider, FawryProvider, etc.
  }
}
```

See Section 5 for the full provider-to-country matrix.

### 2.7 KYC Document Abstraction

Each country requires different identity and licence documents. Make this configurable.

| Country | Required Documents |
|---|---|
| UAE | Emirates ID, UAE Driving Licence, Visa Copy, Passport |
| Saudi Arabia | Iqama (residency permit) or Saudi National ID, Saudi Driving Licence, Passport (for expats) |
| Qatar | QID (Qatar ID), Qatar Driving Licence, Passport (for expats) |
| Bahrain | CPR (Central Population Registry) card, Bahrain Driving Licence, Passport (for expats) |
| Kuwait | Civil ID, Kuwait Driving Licence, Passport (for expats) |
| Oman | Oman Resident Card or National ID, Oman Driving Licence, Passport (for expats) |
| Egypt | National ID, Egyptian Driving Licence, Passport (for foreigners) |

Store the required document list in `country_config.kyc_documents` as a JSON array with document type, display label (in all supported languages), and whether it's mandatory or optional.

---

## 3. Per-Country Regulatory Overview

### 3.1 UAE (Current Market)

| Item | Detail |
|---|---|
| **Current licence** | Shanghai Car Rental LLC — Abu Dhabi (ADRA licence) |
| **Regulatory body** | Each emirate has its own: ADRA (Abu Dhabi), RTA (Dubai), Sharjah Transport Authority, etc. |
| **Fleet registration** | Vehicles must be registered with the respective emirate's transport authority. ITC (Integrated Transport Centre) in Abu Dhabi for fleet cards. |
| **Expansion within UAE** | Requires branch trade licences in each emirate where operations exist. Dubai requires a separate RTA permit; cannot operate on Abu Dhabi licence alone in Dubai. |
| **VAT** | 5% — registered with Federal Tax Authority (FTA), Tax Registration Number (TRN) required on all invoices. |
| **Insurance** | Comprehensive insurance mandatory. Third-party liability is the legal minimum. |
| **Data privacy** | Federal Decree-Law No. 45 of 2021 (UAE Data Protection Law). |

**Immediate action items:**
- Obtain branch licences for Dubai, Sharjah, and other target emirates.
- Register fleet with each emirate's transport authority (ITC in Abu Dhabi, RTA in Dubai).
- Ensure insurance policies cover all operating emirates.

### 3.2 Saudi Arabia

| Item | Detail |
|---|---|
| **Regulatory bodies** | SAMA (Saudi Central Bank) for finance leasing licences; Ministry of Transport and Logistic Services for operational car rental; ZATCA for tax compliance. |
| **Finance lease licence** | Required from SAMA under the Finance Lease Law (Royal Decree M/48). Must be a Saudi-registered joint stock company. Finance lease contracts must be registered with SAJIL (Saudi Company for Leasing Contract Registration). |
| **Operational rental licence** | Ministry of Transport regulates operational (short-term) car rental. Requires commercial registration (CR) with the Ministry of Commerce. |
| **Ejaar system** | SAMA's digital platform for registering and managing finance lease contracts. All lessors must register contracts on Ejaar. Supports standardised model contracts for vehicle leasing to individuals. |
| **VAT** | 15% — ZATCA compliance mandatory. Phase 2 e-invoicing (integration phase / FATOORAH) requires real-time invoice reporting to ZATCA systems. |
| **Vehicle age limits** | Government regulations limit vehicle age — generally vehicles must be under 5 years old for rental fleets. |
| **Insurance** | Comprehensive insurance required. Must comply with SAMA insurance regulations. |
| **Data privacy** | Saudi Personal Data Protection Law (PDPL) — effective September 2023, with enforcement beginning 2024. |
| **Market size** | ~USD 2.75 billion (2025). Growing rapidly under Vision 2030 initiatives. |

**Key challenges:**
- SAMA finance lease licence requires significant capital requirements and a Saudi-incorporated entity.
- E-invoicing integration with ZATCA is technically complex (XML-based UBL 2.1 format).
- Consider starting with operational rental (shorter-term, lighter regulation) before pursuing finance leasing.

### 3.3 Qatar

| Item | Detail |
|---|---|
| **Regulatory body** | Ministry of Transport and Communications (MOTC); Qatar Financial Centre Regulatory Authority (QFCRA) for finance activities. |
| **Licence requirements** | Commercial registration with Ministry of Commerce and Industry (MOCI). Vehicle rental licence from MOTC. |
| **Fleet requirements** | All vehicles must be registered with MOTC. Technical inspection and roadworthiness required annually. |
| **VAT** | 0% — Qatar has not yet implemented VAT despite the GCC VAT framework agreement. No implementation timeline announced. |
| **KYC for customers** | QID (Qatar ID) for residents, valid driving licence, security deposit (typically QAR 2,000+). |
| **Foreign ownership** | Qatar allows 100% foreign ownership in many sectors — verify car rental is included or if a local partner is needed. |
| **Insurance** | Comprehensive insurance required by MOTC regulations. |
| **Data privacy** | Qatar Law No. 13 of 2016 on Personal Data Privacy. |

### 3.4 Bahrain

| Item | Detail |
|---|---|
| **Regulatory body** | Ministry of Transport and Telecommunications (MTT) for vehicle rental licences; Ministry of Industry and Commerce (MOIC) for commercial registration. |
| **Licence requirements** | Commercial registration via Sijilat (national business registration system). Specific car rental licence from MTT. |
| **Operational requirements** | Physical admin office and secure vehicle parking facility required for licensing. All vehicles must be insured and meet road/emission regulations. |
| **VAT** | 10% — increased from 5% in January 2022. National Bureau for Revenue (NBR) compliance required. |
| **Foreign ownership** | Bahrain is relatively open to foreign investment — 100% foreign ownership is possible in many sectors. Verify for car rental specifically. |
| **Insurance** | Mandatory comprehensive insurance for all fleet vehicles. |
| **Data privacy** | Bahrain Personal Data Protection Law (PDPL) — Law No. 30 of 2018. |

### 3.5 Kuwait

| Item | Detail |
|---|---|
| **Regulatory body** | Ministry of Commerce and Industry (MOCI) for licensing and contract regulation; Ministry of Interior for vehicle registration and traffic compliance. |
| **Key regulation** | Ministerial Resolution No. 231/2024 — comprehensive new rules for car rental agreements (effective 2024). |
| **Contract requirements** | Contracts must clearly outline rights and obligations. Promissory notes / bills of exchange are banned. Delivery and return must be photographed. |
| **Vehicle standards** | Rental vehicles must meet all safety standards with emergency kits, spare tyres, and safety equipment. |
| **VAT** | 0% — Kuwait has not implemented VAT. Implementation has been repeatedly postponed; no firm timeline. |
| **Insurance** | Mandatory comprehensive insurance under the new 2024 regulations. |
| **Foreign ownership** | Kuwait restricts foreign ownership in many sectors. Local sponsor / partner likely required for car rental operations. Verify current regulations. |
| **Data privacy** | No comprehensive data protection law yet, but sector-specific regulations exist. |

### 3.6 Oman

| Item | Detail |
|---|---|
| **Regulatory body** | Ministry of Transport, Communications and Information Technology (MTCIT) for transport licensing; Royal Oman Police (ROP) for vehicle registration and compliance. |
| **Licence requirements** | Operating card required for each rental vehicle via the government transport platform. Vehicles limited to 8 passenger seats. |
| **Reporting to police** | Lessee data and leased vehicle details must be reported to the Royal Oman Police. Mechanism required for traffic violation fine collection from lessees. |
| **Operational requirements** | Periodic vehicle inspection and maintenance mandatory. Lost items policy required. Licence and general contract terms must be displayed prominently. |
| **Contract requirements** | Must include: lessee ID, driver's licence details, rental tariff, contract term, delivery/return details, vehicle condition, insurance method, and whether vehicle can be used outside Oman. |
| **VAT** | 5% — implemented April 2021. Oman Tax Authority compliance required. |
| **Insurance** | Comprehensive insurance mandatory with clear disclosure of accident liability in contracts. |
| **Data privacy** | Oman has sector-specific data protection provisions. Royal Decree 64/2023 on personal data protection. |

### 3.7 Egypt

| Item | Detail |
|---|---|
| **Regulatory body** | Financial Regulatory Authority (FRA) for financial leasing licences; General Authority for Investment and Free Zones (GAFI) for company registration. Ministry of Interior for vehicle registration. |
| **Finance leasing licence** | FRA oversees all financial leasing under Law 176/2018. 49 licensed financial leasing companies exist in Egypt. Requires FRA licence for long-term / finance lease operations. |
| **Operational rental** | Short-term car rental requires commercial registration and specific licences from local authorities. |
| **VAT** | 14% — under Law 67/2016. Egyptian Tax Authority (ETA) mandatory e-invoicing applies. |
| **EV incentives** | FRA has enacted Electric Vehicle Incentives Regulation — tax incentives and preferential interest rates for EV leasing. Relevant for BYD fleet expansion. |
| **Currency considerations** | EGP is volatile and subject to periodic devaluations. Consider pricing strategies that account for FX risk (e.g., USD-pegged pricing with EGP settlement). |
| **Foreign ownership** | Egypt allows 100% foreign ownership in most sectors. Company registration through GAFI. |
| **Insurance** | Comprehensive vehicle insurance required. |
| **Data privacy** | Egypt Data Protection Law No. 151 of 2020 (enforcement pending full executive regulations). |
| **Local payment landscape** | Cash and cash-on-delivery are still dominant. Must support: Fawry (kiosk network), mobile wallets (Vodafone Cash, Orange Money), and card payments. |

**Key challenges:**
- EGP currency volatility requires robust FX risk management.
- E-invoicing compliance with ETA.
- Cash-heavy market requires physical payment collection points (Fawry integration critical).
- Significantly different market dynamics from GCC — lower price points, higher volume.

---

## 4. Language Requirements

| Country | Arabic | English | Chinese (zh-CN) | Notes |
|---|---|---|---|---|
| UAE | Required (RTL) | Primary | Yes — large Chinese expat community | Current implementation supports all three. |
| Saudi Arabia | Required (RTL) | Yes | No — minimal demand | Arabic is dominant; English for expat segment. |
| Qatar | Required (RTL) | Yes | No | Large South Asian expat population — consider Hindi/Urdu in future. |
| Bahrain | Required (RTL) | Yes | No | English widely used in business. |
| Kuwait | Required (RTL) | Yes | No | Arabic dominant. |
| Oman | Required (RTL) | Yes | No | English common in tourist/expat contexts. |
| Egypt | Required (RTL) | Yes | No | Egyptian Arabic dialect for marketing copy; MSA for formal/legal content. |

**Architecture implications:**

- The existing i18n system (Next.js with `next-intl`, Flutter `intl` package) already supports EN/AR/ZH-CN for UAE.
- For GCC expansion: AR + EN are sufficient. No new language infrastructure needed.
- For Egypt: Arabic content may need dialect-aware variants for marketing copy (Egyptian Arabic ≠ Gulf Arabic), though MSA works for UI labels and formal content.
- Chinese (zh-CN) can remain a UAE-only language — load it conditionally based on country config to reduce bundle size in other markets.
- Translation keys should be namespaced by country where content differs (e.g., `kyc.document_label.AE` vs `kyc.document_label.SA`).

---

## 5. Payment Provider Matrix

### 5.1 Card Payment Processors

| Provider | UAE | Saudi | Qatar | Bahrain | Kuwait | Oman | Egypt | Notes |
|---|---|---|---|---|---|---|---|---|
| **Checkout.com** | ✅ | ✅ | ⚠️ Verify | ✅ | ✅ | ⚠️ Verify | ✅ | Already integrated. Supports AED, SAR, BHD, KWD, EGP. Verify QAR and OMR support. |
| **Stripe** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | Alternative for UAE/Saudi/Egypt. Limited GCC coverage. |
| **Tap Payments** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | GCC-native. Strong alternative if Checkout.com lacks coverage in QA/OM. |
| **PayTabs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | UAE-founded. Full GCC + Egypt coverage. Backup option. |
| **Paymob** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | Strong in Egypt. Expanding to GCC. |
| **Fawry** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Egypt only. Kiosk / cash collection network (225,000+ locations). Essential for Egypt market. |

### 5.2 BNPL (Buy Now Pay Later) Providers

| Provider | UAE | Saudi | Qatar | Bahrain | Kuwait | Oman | Egypt | Notes |
|---|---|---|---|---|---|---|---|---|
| **Tabby** | ✅ | ✅ | 🔜 | ✅ | ✅ | 🔜 | ❌ | Already integrated. Expanding to QA/OM. |
| **Tamara** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Strong in Saudi Arabia. Checkout.com integration available. |
| **valU** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Leading Egyptian BNPL. Essential for Egypt market. |
| **Shahry** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Egyptian BNPL alternative. |

### 5.3 Recommended Provider Strategy

| Country | Card Processor | BNPL | Cash/Kiosk | Notes |
|---|---|---|---|---|
| **UAE** | Checkout.com | Tabby | — | No changes needed. |
| **Saudi Arabia** | Checkout.com | Tamara + Tabby | — | Add Tamara (dominant Saudi BNPL). ZATCA e-invoicing integration. |
| **Qatar** | Checkout.com or Tap Payments | Tabby (when available) | — | Verify Checkout.com QAR support; fallback to Tap. |
| **Bahrain** | Checkout.com | Tabby | — | Confirm BHD 3-decimal handling. |
| **Kuwait** | Checkout.com | Tabby | — | Confirm KWD 3-decimal handling. |
| **Oman** | Checkout.com or Tap Payments | Tabby (when available) | — | Verify Checkout.com OMR support; fallback to Tap. |
| **Egypt** | Paymob | valU | Fawry | Fundamentally different payment landscape. Fawry kiosk integration is critical. |

---

## 6. Recommended Expansion Order

### Phase 1: UAE Consolidation (Current → Month 3)

**Objective:** Expand from Abu Dhabi to other UAE emirates before going international.

| Task | Detail |
|---|---|
| Branch licences | Obtain trade licences in Dubai (RTA), Sharjah, and other target emirates. |
| Fleet registration | Register vehicles with respective emirate transport authorities. |
| Platform changes | Minimal — add emirate selector within UAE; per-emirate licence display. |
| WhatsApp | Consider emirate-specific numbers or a single UAE-wide number. |

**Why first:** Same regulatory framework (federal UAE law), same currency, same language, same payment providers. Lowest risk, fastest time to market. Validates operational expansion capability.

### Phase 2: Saudi Arabia (Month 3 → Month 9)

**Objective:** Enter the largest GCC market.

| Task | Detail |
|---|---|
| Entity setup | Incorporate Saudi entity (joint stock company for finance leasing, or LLC for operational rental). |
| Licences | Operational car rental licence from Ministry of Transport. If pursuing finance leasing, apply for SAMA licence (6–12 month process). |
| Platform work | Multi-country architecture (Section 2) must be implemented. SAR currency, 15% VAT, Saudi phone validation, Saudi KYC documents. |
| ZATCA e-invoicing | Integrate with ZATCA FATOORAH system for real-time invoice reporting. |
| Payments | Add Tamara BNPL alongside Tabby. Verify Checkout.com SAR processing. |
| Fleet | Source vehicles — BYD and HAVAL/GWM already have Saudi distribution networks. |
| WhatsApp | New +966 WhatsApp Business number. |

**Why second:** Largest GCC market (~USD 2.75B car rental market). Chinese brands (especially BYD) are gaining strong traction in Saudi Arabia. Vision 2030 is driving transport sector modernisation. However, regulatory complexity (SAMA, ZATCA) requires significant effort.

### Phase 3: Rest of GCC — Bahrain, Kuwait, Qatar, Oman (Month 9 → Month 15)

**Objective:** Roll out across remaining GCC states. These can be parallelised to some degree.

**Recommended sub-order:**

1. **Bahrain** (Month 9–11) — Small market but open to foreign investment, geographically close to Saudi (can share fleet/ops), straightforward licensing via Sijilat.
2. **Kuwait** (Month 10–12) — New 2024 car rental regulations are well-defined. No VAT simplifies pricing. May need local partner due to foreign ownership restrictions.
3. **Oman** (Month 11–13) — 5% VAT (same as UAE), clear transport platform requirements, Royal Oman Police reporting integration needed.
4. **Qatar** (Month 12–15) — No VAT, 100% foreign ownership possible, but smallest GCC car rental market. Consider demand validation before full launch.

**Shared platform work:** By this phase, the multi-country architecture from Phase 2 should be mature. Each new country is primarily a configuration + licensing + fleet exercise, not a platform rebuild.

### Phase 4: Egypt (Month 15 → Month 24)

**Objective:** Enter a fundamentally different market with high volume potential.

| Task | Detail |
|---|---|
| Entity setup | Register with GAFI. Obtain FRA licence for financial leasing or local operational rental licence. |
| Platform work | EGP currency (2 decimals), 14% VAT, +20 phone validation, Egyptian KYC documents. |
| Payments | **Completely different stack:** Paymob (cards), Fawry (kiosk/cash), valU (BNPL). Cash collection infrastructure is critical. |
| E-invoicing | ETA electronic invoicing integration. |
| Language | Arabic content review — Egyptian dialect for marketing, MSA for formal content. Remove Chinese language option. |
| Pricing strategy | EGP volatility means pricing must be reviewed frequently. Consider USD-pegged lease structures for longer-term contracts. |
| Fleet | BYD has growing presence in Egypt. Leverage EV incentives under FRA regulations. |
| Operations | Fundamentally different ops model — lower ASP, higher volume, cash handling, different customer demographics. |

**Why last:** Egypt is the most different market — different currency dynamics, different payment landscape (cash-dominant), different regulatory framework, different price points. The platform and ops team need to be mature before tackling this complexity.

---

## 7. Estimated Effort

### 7.1 Platform Engineering (Multi-Country Architecture)

| Work Package | Estimated Hours | Notes |
|---|---|---|
| Country config system (DB, API, admin UI) | 80–120 | Core enabler. Must be done before any expansion. |
| Currency handling (storage, formatting, 3-decimal support) | 40–60 | Affects all monetary display and storage. |
| Tax engine (configurable rates, invoice generation) | 60–80 | Includes per-country tax display and invoice templates. |
| Phone validation (country-aware input, OTP routing) | 20–30 | UI component + backend validation. |
| KYC document abstraction (configurable upload flow) | 40–60 | UI changes + backend document type management. |
| Payment provider factory (abstraction layer) | 80–120 | Abstract Checkout.com, add provider interface, factory pattern. |
| Database migration (add country_code, RLS policies) | 40–60 | Data migration for existing UAE data. Must be zero-downtime. |
| i18n updates (country-specific translation keys) | 20–40 | Namespace translations, conditional language loading. |
| Admin dashboard (country selector, per-country views) | 60–80 | Fleet, bookings, reports filtered by country. |
| **Subtotal — Platform** | **440–650 hrs** | |

### 7.2 Per-Country Integration Work

| Country | Estimated Hours | Key Effort |
|---|---|---|
| UAE (other emirates) | 20–40 | Minimal platform work. Mostly licensing and ops. |
| Saudi Arabia | 120–180 | ZATCA e-invoicing, Tamara BNPL, Saudi-specific compliance. |
| Bahrain | 40–60 | Config + testing. 10% VAT, BHD 3-decimal. |
| Kuwait | 40–60 | Config + testing. No VAT, KWD 3-decimal. |
| Qatar | 40–60 | Config + testing. No VAT. Verify payment provider coverage. |
| Oman | 40–60 | Config + testing. ROP reporting integration. |
| Egypt | 160–240 | Paymob + Fawry + valU integration, ETA e-invoicing, EGP handling. |
| **Subtotal — Country** | **460–700 hrs** | |

### 7.3 Total Estimate

| Category | Hours | Duration (2-dev team) |
|---|---|---|
| Platform architecture | 440–650 | 3–4 months |
| Country integrations | 460–700 | 3–5 months (parallelised after platform is ready) |
| QA / UAT per country | 160–240 | Ongoing |
| **Total** | **1,060–1,590 hrs** | **~9–15 months** |

> These estimates cover engineering effort only. Licensing, entity setup, fleet sourcing, and operational buildout (hiring local staff, securing parking/offices) are separate workstreams that typically run in parallel with platform development.

### 7.4 Critical Path

```
Month 1–3:   Platform architecture (country config, currency, tax, payment abstraction)
Month 2–3:   UAE emirate expansion (licensing, fleet registration — ops-led)
Month 3–6:   Saudi Arabia integration (ZATCA, Tamara, Saudi config)
Month 6–9:   Saudi Arabia UAT + launch
Month 6–12:  GCC rollout (Bahrain → Kuwait → Oman → Qatar, parallelised)
Month 12–18: Egypt integration (Paymob, Fawry, valU, ETA)
Month 18–21: Egypt UAT + launch
```

---

## Appendix A: Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| SAMA licence rejection or delay (Saudi) | Blocks Saudi finance leasing | Start with operational rental only; apply for SAMA licence in parallel. |
| ZATCA e-invoicing integration complexity | Delays Saudi launch | Engage Saudi-based ZATCA integration partner early. |
| Checkout.com doesn't support QAR/OMR | Blocks Qatar/Oman payments | Integrate Tap Payments as fallback for full GCC coverage. |
| EGP devaluation mid-contract | Revenue loss in Egypt | USD-pegged pricing for long-term leases; frequent price reviews for short-term. |
| Kuwait foreign ownership restrictions | Blocks direct entry | Identify local partner early; structure as JV or franchise. |
| Cross-country data residency conflicts | Compliance violations | Deploy country-specific database replicas or use region-locked cloud zones. Consider UAE, Saudi, and Egypt as separate data residency zones. |
| Chinese brand perception varies by market | Lower demand in some markets | Conduct market research per country. BYD's EV positioning is strongest — lead with EV narrative. |

---

## Appendix B: Data Residency Considerations

| Region | Requirement | Recommended Hosting |
|---|---|---|
| UAE | Federal Decree-Law 45/2021 — data may need to stay in UAE. | Azure UAE North (Dubai) or AWS me-central-1 |
| Saudi Arabia | PDPL — personal data of Saudi residents should be processed in KSA where practical. | Azure Saudi (if available) or local provider. Consider NdcTech or STC Cloud. |
| GCC (QA, BH, KW, OM) | Generally less strict. Can likely share UAE hosting for now. | Azure UAE North (shared with UAE) |
| Egypt | Data Protection Law 151/2020 — executive regulations pending but expect local processing preference. | Azure Egypt (if available) or local cloud provider. |

**Recommendation:** Start with a single UAE-hosted database for UAE + GCC. Add a Saudi replica when entering Saudi Arabia. Add an Egypt-specific deployment when entering Egypt.
