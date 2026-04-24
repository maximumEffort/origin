# App Store Submission Guide — Origin Car Leasing

**App Name:** Origin Car Leasing
**Company:** Origin (Shanghai Car Rental LLC, Abu Dhabi)
**Platforms:** iOS (Apple App Store) & Android (Google Play Store)
**Target Markets:** UAE (primary), GCC expansion (future)
**Languages Supported:** English (en) | Arabic (ar) | Simplified Chinese (zh-CN)
**App Version:** 1.0.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Pre-Submission Checklist](#pre-submission-checklist)
2. [Developer Accounts & Setup](#developer-accounts--setup)
3. [Apple App Store Submission](#apple-app-store-submission)
4. [Google Play Store Submission](#google-play-store-submission)
5. [Shared Requirements](#shared-requirements)
6. [Post-Launch Monitoring](#post-launch-monitoring)
7. [Update & Versioning Strategy](#update--versioning-strategy)

---

## Pre-Submission Checklist

Complete these items before initiating any app store submissions:

### App Development & Testing
- [ ] All features in v1.0.0 are implemented and tested (vehicle catalogue, lease calculator, booking flow, KYC upload, customer portal, WhatsApp integration)
- [ ] App tested on minimum supported iOS version (iOS 12+) and Android API level (API 24+)
- [ ] Multilingual UI fully tested: English (LTR), Arabic (RTL), Simplified Chinese (LTR)
- [ ] All buttons, text fields, and navigation work correctly in both LTR and RTL layouts
- [ ] Lease calculator accurately includes VAT (5%) in all price displays
- [ ] Payment gateway integration (Checkout.com) tested in sandbox environment
- [ ] WhatsApp integration functional; deep links to WhatsApp working on both platforms
- [ ] Firebase push notifications configured and tested
- [ ] Crash reporting (Sentry) integrated and functional

### App Signing & Security
- [ ] **iOS:** Apple Developer Certificate and Provisioning Profile created
- [ ] **Android:** Keystore file generated and securely stored; keystore password documented
- [ ] **Android:** App signing enabled via Google Play App Signing (recommended; Google manages final signing)
- [ ] Privacy Policy document drafted and reviewed
- [ ] Terms of Service document drafted and reviewed
- [ ] GDPR + UAE Federal Data Protection Law (Federal Decree-Law No. 45 of 2021) compliance verified

### Store Assets Prepared
All assets should be located in `mobile-app/store-assets/`:
- [ ] English description: `en/description.txt` ✓ (ready)
- [ ] Arabic description: `ar/description.txt` ✓ (ready)
- [ ] Simplified Chinese description: `zh/description.txt` ✓ (ready)
- [ ] Keywords: `keywords.txt` ✓ (ready)
- [ ] Release notes v1.0.0: `release-notes.txt` ✓ (ready)
- [ ] App icon (1024×1024 PNG, no transparency required) — placeholder or final
- [ ] Screenshots (6 per language minimum; see dimensions below)
- [ ] App preview video (iOS; optional but recommended for conversion)
- [ ] Feature graphic (Android; 1024×500 PNG)

### Compliance & Legal
- [ ] RTA (Roads and Transport Authority) compliance statements reviewed
- [ ] VAT itemisation verified across all pricing displays and quotes
- [ ] KYC document requirements (Emirates ID, driving licence, passport, visa) confirmed compliant with UAE law
- [ ] Insurance disclosures (comprehensive + third-party liability included) verified
- [ ] Payment security & PCI DSS compliance confirmed
- [ ] Age rating determined (4+ — no restricted content)
- [ ] Any third-party SDKs reviewed for compliance (Firebase, Sentry, Checkout.com, WhatsApp API)

### Analytics & Monitoring Setup
- [ ] Firebase Analytics enabled in app; key events instrumented
- [ ] Sentry error tracking configured
- [ ] Crash reporting tested and verified
- [ ] Deep link tracking configured
- [ ] Conversion funnels set up (download → first_browse → booking_initiated → booking_confirmed)

---

## Developer Accounts & Setup

### Apple Developer Program

**Cost:** $99 USD per year
**Time to Activate:** 24–48 hours (typically)

#### Account Setup Steps

1. **Enrol in Apple Developer Program**
   - Visit [developer.apple.com/programs](https://developer.apple.com/programs)
   - Select individual or organization account type (recommend **organization** for Origin)
   - Provide company legal name (Origin, Shanghai Car Rental LLC, Abu Dhabi), D-U-N-S number, and registered address
   - Complete identity verification and sign legal agreements
   - Pay $99 USD enrollment fee
   - Confirm email invitation within 48 hours

2. **Create App Store Connect Account**
   - Log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Register with Apple ID associated with the organization account
   - Agree to Apple Developer Agreement and Program Policies
   - Set up Team ID (will be assigned by Apple)
   - Team ID Format: `XXXXXXXXXX` (10-character alphanumeric code; e.g., `A1B2C3D4E5`)

3. **Create New App Record in App Store Connect**
   - Go to Apps > **New App**
   - Select **iOS**
   - Fill in:
     - **App Name:** `Origin Car Leasing` (matches app bundle display name)
     - **Primary Language:** English
     - **Bundle ID:** `com.origincarleasing.app` (must match Xcode project)
     - **SKU:** `origin-car-leasing-1-0-0` (internal ID; can be any unique value)
     - **User Access:** Select appropriate user role (Admin)

4. **Generate Certificates & Provisioning Profiles**
   - In Xcode, go to **Xcode > Preferences > Accounts**
   - Add Apple ID and organisation account
   - Manage Signing Certificates:
     - **Apple Development Certificate** (for development/testing)
     - **Apple Distribution Certificate** (for App Store release)
   - Xcode will auto-generate provisioning profiles for these certificates

5. **Enable Required Capabilities**
   - In Xcode, select project > Target > **Signing & Capabilities**
   - Add:
     - **Push Notifications** (for Firebase)
     - **Sign in with Apple** (if included as future feature)
     - **Network Extension** (if VPN/proxy features added later)
     - **HomeKit** (not required for v1.0.0)

---

### Google Play Developer Account

**Cost:** $25 USD one-time registration fee
**Time to Activate:** Instant (after payment)

#### Account Setup Steps

1. **Create Google Play Developer Account**
   - Visit [play.google.com/apps/publish](https://play.google.com/apps/publish)
   - Sign in with Google account (recommend creating an organization account email like `dev@origin-leasing.ae`)
   - Accept terms and pay $25 USD registration fee
   - Complete developer profile:
     - Developer Name: `Origin Car Leasing`
     - Email: `support@origin-leasing.ae` (or dev contact)
     - Address: Dubai, UAE
     - Phone: UAE mobile number (+971 XXX XXX XXXX)

2. **Link Google Play Account to Google Cloud Project**
   - Go to **Settings > Developer Account > Linked Accounts**
   - Create or link a Google Cloud Project for API access
   - This enables App Signing by Google Play (recommended)

3. **Create New App Record**
   - Go to **Create App**
   - Fill in:
     - **App Name:** `Origin Car Leasing`
     - **Default Language:** English
     - **App Type:** Application
     - **Category:** Auto & Vehicles (or Tools)
   - Google assigns **App ID** (numeric; e.g., `123456789`)
   - Confirm app contents (you'll fill detailed info in next step)

4. **Configure App Signing**
   - Google Play automatically manages signing keys for submitted APKs
   - You upload an unsigned APK built with Release keystore
   - Google signs the final APK for distribution
   - You can download the signing certificate for reference (optional)
   - **Backup:** Keep a copy of your original Android Keystore (`origin-leasing.jks`) offline

---

## Apple App Store Submission

### Step 1: Prepare App Metadata

#### 1.1 App Information

In **App Store Connect > General > App Information:**

- **App Name:** `Origin Car Leasing` (max 30 characters)
- **Subtitle:** `Lease Premium Chinese Vehicles in UAE` (max 30 characters)
- **Bundle ID:** `com.origincarleasing.app` (must match Xcode project)
- **App ID Prefix:** Auto-assigned (e.g., `XXXXXXXXXX.`)
- **Primary Language:** English
- **Supported Languages:** English, Arabic, Simplified Chinese (auto-set from localization)

#### 1.2 Description & Keywords

All fields support localisation for AR and ZH-CN; complete all three language versions.

**English Metadata:**

- **Description (Up to 4,000 characters):**
  ```
  Welcome to Origin Car Leasing – your trusted partner for premium vehicle rentals in Dubai and the UAE. We offer a seamless, mobile-first platform to browse, book, and manage short-term and long-term leases of premium Chinese vehicles (BYD, HAVAL, Chery, Geely, and more).

  ✓ Browse our fleet by brand, category, and price
  ✓ Instant lease calculator with transparent pricing (including 5% VAT)
  ✓ Secure online booking with KYC document upload
  ✓ Real-time booking and lease management
  ✓ 24/7 WhatsApp support
  ✓ Comprehensive insurance included or available
  ✓ RTA-compliant vehicles

  Why Origin?
  - Advanced technology: Electric & hybrid options from BYD
  - Competitive pricing: Best value in the UAE market
  - Easy process: KYC verification, insurance, and pickup in minutes
  - Multi-language support: English, Arabic, Simplified Chinese

  Book your car today and experience premium leasing made simple.
  ```

- **Keywords (Up to 100 characters combined):**
  ```
  car leasing, car rental, Dubai, UAE, BYD, HAVAL, Chery, Chinese vehicles
  ```

- **Support URL:**
  ```
  https://origin-leasing.ae/support
  ```

- **Privacy Policy URL:**
  ```
  https://origin-leasing.ae/privacy
  ```

- **Marketing URL (optional):**
  ```
  https://origin-leasing.ae
  ```

**Arabic Metadata:**
Provide Arabic translations (Modern Standard Arabic with Gulf dialect touches). Examples:

- **الاسم:** `تطبيق تأجير اوريجن`
- **الوصف:** [Arabic translation of the above description]
- **الكلمات المفتاحية:** تأجير السيارات، دبي، الإمارات، BYD، HAVAL، شيري، جيلي

**Simplified Chinese Metadata:**

- **应用名称:** `Origin车租赁`
- **描述:** [Simplified Chinese translation]
- **关键词:** 汽车租赁, 迪拜, 阿联酋, 比亚迪, 长城, 奇瑞, 吉利

---

#### 1.3 Ratings & Content Advisory

In **App Store Connect > Ratings:**

Answer the content rating questionnaire. Origin is rated **4+** (ESRB):
- **Alcohol, Tobacco, Drugs:** No
- **Gambling:** No
- **Horrors/Fears:** No
- **Mature Content:** No
- **Medical/Treatment Info:** No
- **Violence:** No
- **Profanity:** No
- **Sexual Content:** No
- **Unrestricted Web Access:** No (WhatsApp, Checkout.com, Google Maps are used but for app functionality, not general browsing)

---

#### 1.4 Age Rating Summary

After completing the questionnaire, Apple auto-assigns:
- **ESRB:** 4+
- **IARC:** 4+
- **USK:** 0
- **ClassInd:** L
- **GRAC:** 3
- **Pegi:** 3

This is acceptable for Origin Car Leasing.

---

### Step 2: Upload App Binary & Select Build

#### 2.1 Create Release Build in Xcode

1. **Open Xcode Project**
   - File > Open > `mobile-app/` (Flutter project root)
   - Select workspace if available (`*.xcworkspace`)

2. **Set Version & Build Number**
   - Select project > Targets > General
   - **Version Number:** `1.0.0` (must match `pubspec.yaml`)
   - **Build Number:** `1` (auto-increment for each submission)

3. **Build for Release**
   ```bash
   cd mobile-app
   flutter build ipa --release --build-name=1.0.0 --build-number=1
   ```
   - Output: `build/ios/ipa/origin_car_leasing.ipa`

4. **Upload via Xcode (or use Transporter)**

   **Option A: Xcode (Recommended for first-time)**
   - In Xcode: **Product > Archive**
   - Select the archive from the list
   - Click **Validate App** (checks for common errors)
   - Click **Upload to App Store**
   - Wait for processing (5–10 minutes)

   **Option B: Transporter App (Apple's official tool)**
   - Download Transporter from Mac App Store
   - Open `.ipa` file
   - Sign in with Apple ID
   - Click Deliver

#### 2.2 Select Build in App Store Connect

After upload, builds appear in **App Store Connect > Builds > iOS**:
- Wait 5–10 minutes for processing
- Once processed, you'll see build `1.0.0 (1)` ready for testing or submission
- Click **Select** next to the build for the version being submitted

---

### Step 3: Review Metadata Before Submission

Checklist before pressing Submit for Review:

- [ ] App Name, subtitle, description, keywords all filled in all three languages
- [ ] Ratings questionnaire complete; age rating 4+ confirmed
- [ ] Privacy Policy URL provided and accessible
- [ ] Support URL provided and accessible
- [ ] Screenshots (min 2, max 10 per version; recommended 4-6) uploaded for all languages
- [ ] Preview Video (optional, but recommended) uploaded
- [ ] Build selected and processed
- [ ] Terms & Conditions accepted

### Step 4: Review & Address Rejections

#### Common Rejection Reasons (& How We Prevent Them)

1. **Incomplete or Misleading Metadata**
   - Prevention: Ensure all language descriptions are accurate and match the app's actual features

2. **KYC Document Upload Compliance**
   - Prevention: Privacy Policy clearly states data handling for Emirates ID, driving license, passport, visa (see Section 5)
   - Risk: If Apple flags KYC as excessive, clarify that it's a UAE legal requirement for car rental/leasing

3. **Payment Integration Issues**
   - Prevention: Checkout.com is approved by Apple; test payments in sandbox mode before submission
   - Risk: If payment fails, Apple may request additional info on PCI compliance

4. **WhatsApp Deep Linking**
   - Prevention: Ensure `whatsapp://` URLs work and are non-mandatory (graceful fallback to web form)
   - Risk: If Apple flags it as not user-initiated, restructure to a button with explicit user action

5. **Crash on Launch**
   - Prevention: Test on iOS 12+ with minimal network connectivity; ensure all Firebase/Sentry SDKs init gracefully

6. **Arabic/RTL Layout Issues**
   - Prevention: Test app in Arabic mode on device; ensure button labels, icons, and scrolling all work correctly in RTL

7. **Insurance/Regulatory Claims**
   - Prevention: Ensure disclaimer text is clear: "Comprehensive insurance included or offered per RTA requirements"
   - Risk: If Apple questions insurance claims, provide RTA compliance documentation

#### Response Strategy for Rejections

If rejected:
1. Read the rejection reason carefully (usually points to specific section)
2. Acknowledge in a response comment in App Store Connect (you'll see a "Reply" button)
3. Fix the issue (if code), bump build number to `2`, and re-upload
4. Re-submit with explanation (example: "Fixed crash in Arabic mode, added RTA compliance disclaimer")
5. Average resubmission: 24–48 hours

---

### Step 5: Submit for Review

In **App Store Connect > Version > General:**

1. Click **Submit for Review**
2. **Export Compliance:** Answer whether app contains encryption. Origin uses:
   - HTTPS for API communication (standard, exempt from declaration)
   - Firebase SDKs (encryption exempt)
   - Checkout.com payment gateway (no encryption issue)
   - **Answer: No** (or mark as "encryption exempt")
3. **Advertising ID:** Not used in v1.0.0 (answer **No**)
4. **Provide Email & Phone** for Apple review contact
5. Confirm all metadata is correct
6. **Submit**

---

### Step 6: Monitor Review Status

**Timeline:** 24 hours to 5+ days (usually 24–48 hours for straightforward apps)

In **App Store Connect > Activity > Versions:**
- **In Review:** Apple is reviewing (typically 24–48 hours)
- **Approved:** App approved, will go live on selected date (or immediately)
- **Rejected:** See rejection reason; fix and resubmit
- **Metadata Rejected:** Metadata issue; edit and resubmit without re-uploading binary

**Status Notifications:**
- Apple sends email notifications for status changes
- You can manually refresh in App Store Connect

---

### Step 7: Release to App Store

Once **Approved**:

1. **Set Release Date (Optional)**
   - Default: Immediate release
   - Alternative: Schedule for specific date (e.g., marketing launch date)

2. **Release Notes (Optional but Recommended)**
   - Provide v1.0.0 release notes (appear in App Store)
   - **Example:**
     ```
     Thank you for choosing Origin Car Leasing!

     v1.0.0 – Initial Release
     - Browse and book premium Chinese vehicles
     - Real-time lease calculator with VAT itemisation
     - Secure KYC document upload
     - 24/7 WhatsApp support
     - Support for English, Arabic, and Simplified Chinese

     We're excited to serve you. For issues, please contact us via WhatsApp in-app.
     ```

3. **Click Release**

---

## Google Play Store Submission

### Step 1: Prepare App Metadata

#### 1.1 App Details

In **Google Play Console > App > Store Listing:**

- **App Name:** `Origin Car Leasing` (max 50 characters)
- **Short Description:** `Premium vehicle leasing in UAE` (max 80 characters)
- **Full Description (Up to 4,000 characters):**
  ```
  Welcome to Origin Car Leasing – your trusted partner for premium vehicle rentals in Dubai and the UAE. We offer a seamless, mobile-first platform to browse, book, and manage short-term and long-term leases of premium Chinese vehicles (BYD, HAVAL, Chery, Geely, and more).

  ✓ Browse our fleet by brand, category, and price
  ✓ Instant lease calculator with transparent pricing (including 5% VAT)
  ✓ Secure online booking with KYC document upload
  ✓ Real-time booking and lease management
  ✓ 24/7 WhatsApp support
  ✓ Comprehensive insurance included or available
  ✓ RTA-compliant vehicles

  Why Origin?
  - Advanced technology: Electric & hybrid options from BYD
  - Competitive pricing: Best value in the UAE market
  - Easy process: KYC verification, insurance, and pickup in minutes
  - Multi-language support: English, Arabic, Simplified Chinese

  Book your car today and experience premium leasing made simple.
  ```

#### 1.2 Short Description

- **Language:** English (auto-set when you select app language)
- **Text:** `Premium vehicle leasing in UAE – BYD, HAVAL, Chery, Geely`

#### 1.3 Localisation (Multiple Languages)

Create a new **Store Listing** entry for each language:

**Arabic Version:**
- Select **Language > Arabic**
- Repeat all fields with Arabic translations
- Screenshots in Arabic (optional, but recommended)

**Simplified Chinese Version:**
- Select **Language > Simplified Chinese**
- Repeat all fields with Chinese translations
- Screenshots in Chinese (optional, but recommended)

---

#### 1.4 Graphic Assets

Upload to **Google Play Console > Store Listing > Graphic Assets:**

**App Icon**
- Size: 512 × 512 pixels (PNG)
- Must have 32px safe zone (only 448 × 448 visible)
- Background: Solid color or gradient (no transparency)
- Recommendation: Origin logo on neutral background

**Feature Graphic**
- Size: 1024 × 500 pixels (PNG or JPEG)
- Displayed at top of store listing
- Recommendation: Car image + "Origin Car Leasing" text in English + Arabic

**Promotional Graphics (Optional)**
- Tablet large: 1024 × 500 px
- Phone: 512 × 512 px
- Recommendation: Marketing assets (e.g., "Download Now" banner)

**Screenshots (Minimum 2, Maximum 8)**
- Portrait: 9:16 aspect ratio (e.g., 540 × 960 or 1080 × 1920)
- Landscape: 16:9 aspect ratio (e.g., 1920 × 1080)
- Recommended: 4-6 screenshots per language showing key features
- Include:
  1. App home screen
  2. Car catalogue/browsing
  3. Lease calculator
  4. Booking flow
  5. Customer portal
  6. WhatsApp support

**Preview Video (Optional)**
- Duration: 15–30 seconds
- Format: MP4, 1920 × 1080 minimum
- Content: Quick walkthrough of core features
- Example: Browse → Calculate → Book → Confirm

---

#### 1.5 Categorisation

- **Category:** Lifestyle, Tools, or Auto & Vehicles
- **Content Rating:** Everyone (4+)
- **Target Android API Level:** API 24 and above

---

### Step 2: Content Rating Questionnaire

Google Play requires a **Content Rating Questionnaire** similar to Apple's.

In **Google Play Console > Store Listing > App Content Ratings:**

1. **Select Category:** Select the appropriate category (e.g., Finance, Business, or Auto)
2. **Answer Questionnaire:** All responses should be **No** for Origin (no violence, sexual content, profanity, gambling, etc.)
3. **Generate Rating:** Google auto-assigns a rating (typically Everyone or Everyone 10+)

---

### Step 3: Privacy & Permissions

#### 3.1 Privacy Policy

In **Google Play Console > App > Privacy & Permissions:**

- **Link to Privacy Policy:** https://origin-leasing.ae/privacy
- **Requested Permissions:** List permissions your app uses (see below)

#### 3.2 Permissions Justification

List all permissions requested by the app:

| Permission | Why Used | Justification |
|---|---|---|
| `android.permission.INTERNET` | API calls, Firebase, payments | Network access for core functionality |
| `android.permission.ACCESS_FINE_LOCATION` | Google Maps, pickup/drop-off | Location selection for lease pickup |
| `android.permission.ACCESS_COARSE_LOCATION` | Google Maps fallback | Location services |
| `android.permission.CAMERA` | KYC photo capture (optional) | Document upload (if photo verification added) |
| `android.permission.READ_EXTERNAL_STORAGE` | Document upload | Upload Emirates ID, driving license scans |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Document storage | Cache downloaded lease agreements |
| `android.permission.POST_NOTIFICATIONS` | Firebase push notifications | Booking confirmations, payment reminders |

**Note:** Ensure AndroidManifest.xml and app code only request permissions that are actually used. Unused permissions can cause rejection.

---

### Step 4: Prepare Android App Bundle (AAB)

#### 4.1 Generate Signing Key (If Not Already Done)

If you haven't created a keystore, generate one:

```bash
keytool -genkey -v -keystore origin-leasing.jks \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias origin-car-leasing
```

**Prompts:**
- Keystore password: `[Create strong password; store securely]`
- Key password: `[Can be same as keystore password]`
- Name: `Origin Car Leasing`
- Organisational Unit: `Mobile Development`
- Organisation: `Origin (Shanghai Car Rental LLC, Abu Dhabi)`
- City: `Dubai`
- State: `Dubai`
- Country Code: `AE`

**Output:** `origin-leasing.jks` (keep offline; needed for all future releases)

#### 4.2 Build Android App Bundle (AAB)

```bash
cd mobile-app

flutter build appbundle \
  --release \
  --build-name=1.0.0 \
  --build-number=1
```

**Output:** `build/app/outputs/bundle/release/app-release.aab`

---

#### 4.3 Verify Bundle Signing

Optional: Validate the AAB before upload:

```bash
bundletool validate --bundle-path=app-release.aab
```

---

### Step 5: Upload App Bundle to Google Play

#### 5.1 Upload via Google Play Console

1. Go to **Google Play Console > App > Release > Production**
2. Click **Create new release**
3. Upload `app-release.aab` (or `app-release.apk` if not using AAB)
4. **Release name:** `1.0.0`
5. **Release notes:**
   ```
   v1.0.0 – Initial Release
   - Browse and book premium Chinese vehicles
   - Real-time lease calculator with VAT itemisation
   - Secure KYC document upload
   - 24/7 WhatsApp support
   - Support for English, Arabic, and Simplified Chinese
   ```
6. Review rollout % (typically 100% for v1.0.0)
7. Click **Review** (Google scans for issues)
8. If no issues, click **Release to Production**

#### 5.2 App Signing Configuration

When uploading AAB, Google Play shows:
- **App Signing by Google Play:** Status shows Google will sign the app with their key
- **Your Signing Certificate:** Google provides the certificate SHA1 for reference
- **Download certificate:** Optional (for records)

---

### Step 6: Monitor Review & Testing Tracks

#### 6.1 Internal Test Track (Recommended Before Production)

Before releasing to production, upload to **Internal Testing** to catch last-minute issues:

1. Go to **Google Play Console > Release > Testing > Internal testing**
2. Create a new release with the same AAB
3. Add testers' email addresses (internal team)
4. Share internal test link (testers can download from Google Play without public listing)
5. Wait 24 hours for internal feedback
6. Fix any critical issues
7. Move to **Closed Testing** (limited external beta) or **Production** based on results

#### 6.2 Closed Testing (Optional)

For wider user testing before launch:

1. **Google Play Console > Release > Testing > Closed testing**
2. Create release and define tester group (e.g., "UAE Beta Testers")
3. Send public link to external testers (not visible in main Play Store yet)
4. Collect feedback via in-app crash reports and reviews
5. Fix issues, increment build number, re-upload

---

### Step 7: Address Rejections

#### Common Rejection Reasons

1. **Overly Broad Permissions**
   - Problem: Requesting permissions not justified by features
   - Prevention: Only request INTERNET, LOCATION, CAMERA (if KYC photo capture), WRITE_EXTERNAL_STORAGE
   - Solution: Declare precise permissions in AndroidManifest.xml and justify in Google Play Console

2. **Incomplete Store Listing**
   - Problem: Missing privacy policy, support email, or store description
   - Prevention: Complete all required fields before submission

3. **KYC / Data Privacy Concerns**
   - Problem: Google may flag KYC document upload as excessive data collection
   - Prevention: Provide clear Privacy Policy and explain why (UAE car rental legal requirement)
   - Solution: In Google Play Console, provide evidence of UAE regulations

4. **Misleading Claims**
   - Problem: Claims about vehicles, insurance, or pricing not substantiated
   - Prevention: Ensure marketing copy is accurate; VAT is correctly itemised in calculator

5. **Uninitialized Firebase / Crashes**
   - Problem: App crashes on launch if Firebase initialisation fails
   - Prevention: Graceful fallback if Firebase unavailable; test on Android 8 and 12+

6. **Unsafe Permissions Usage**
   - Problem: WRITE_EXTERNAL_STORAGE used incorrectly
   - Prevention: Use scoped storage (Android 11+) or request permission only when needed

#### Response & Resubmission

If rejected:
1. Check rejection email from Google Play (details provided)
2. Fix the issue (code, metadata, or permissions)
3. Increment build number (e.g., `1.0.1`)
4. Rebuild and re-upload AAB
5. Resubmit with explanation (Google Play allows optional response message)
6. Turnaround: Usually 24–48 hours

---

### Step 8: Release to Production

Once approved by Google Play:

1. **Staged Rollout (Recommended):**
   - Start with 5–10% rollout (test with real users)
   - Wait 24–48 hours for crash/issue reports
   - Increase to 25% → 50% → 100% over several days
   - This reduces risk if critical bug is missed

2. **Immediate Release:**
   - Release to 100% of users immediately
   - Use only if fully confident

3. **Set Release Date:**
   - Default: Immediate
   - Alternative: Schedule release for specific date (marketing launch)

4. **Monitor After Release:**
   - Watch crash rates in **Google Play Console > Android vitals**
   - Monitor user reviews for critical issues
   - Be ready to deploy hotfix (v1.0.1) if needed

---

## Shared Requirements

### App Metadata Requirements (Both Platforms)

#### Screenshots Specifications

**iOS Requirements:**
- **iPhone (Minimum):** 1125 × 2436 pixels (6.5-inch or similar)
- **iPad (Optional):** 2048 × 2732 pixels (12.9-inch)
- **Portrait orientation** required
- Max 10 images per version
- Recommended: 4-6 images covering key features

**Android Requirements:**
- **Portrait:** 1080 × 1920 pixels (9:16 aspect ratio)
- **Landscape:** 1920 × 1080 pixels (16:9 aspect ratio)
- Max 8 images
- Recommended: 4-6 images

**Content for Screenshots (Both Platforms):**

1. **Home/Dashboard**
   - Hero image or featured car
   - Call-to-action: "Browse Our Fleet"

2. **Car Browsing**
   - Filter options (brand, price)
   - Car listing with price

3. **Lease Calculator**
   - Input fields (duration, mileage)
   - Calculated price with VAT breakdown

4. **Booking Flow**
   - Document upload screen
   - Payment gateway

5. **Customer Portal**
   - Active lease details
   - Upcoming payments

6. **WhatsApp Support**
   - Support widget
   - Quick messaging

**Localisation:**
- Provide screenshots in English, Arabic (RTL), and Simplified Chinese
- Or mark "Same for all languages" if generic enough

---

### Privacy Policy & Terms of Service

#### Privacy Policy Template

Location: https://origin-leasing.ae/privacy

**Key Sections (Required for UAE + Apple/Google):**

1. **Data Collection**
   - Personal: Name, email, phone, UAE address
   - Documents: Emirates ID number, driving licence, passport, visa (KYC)
   - Automotive: Vehicle preferences, lease history
   - Technical: Device ID, IP, usage analytics (Firebase)

2. **Data Use**
   - KYC verification (required by UAE car rental law)
   - Payment processing (Checkout.com)
   - Customer support (WhatsApp)
   - Analytics & crash reporting (Firebase, Sentry)

3. **Data Retention**
   - KYC documents: 3–5 years (per UAE regulations)
   - Lease history: Duration of customer relationship + 2 years
   - Technical logs: 30 days

4. **Third-Party Sharing**
   - Checkout.com (payment processor)
   - Firebase (Google; analytics, push)
   - Sentry (crash reporting)
   - Google Maps (location services)
   - WhatsApp Business API (messaging)
   - **No sharing** with advertisers or data brokers

5. **Data Security**
   - HTTPS encryption
   - Secure document storage
   - No plaintext passwords or API keys in code

6. **GDPR + UAE Compliance**
   - Data Processing Agreement with third parties
   - User rights: Access, correction, deletion
   - Data Protection Officer contact: privacy@origin-leasing.ae
   - UAE Federal Data Protection Law (Federal Decree-Law No. 45 of 2021) compliance

7. **Cookies & Tracking**
   - Firebase Analytics: Opt-out available in app settings
   - No third-party cookies (only first-party Firebase)

---

#### Terms of Service Template

Location: https://origin-leasing.ae/terms

**Key Sections:**

1. **Lease Agreement Terms**
   - Lease duration: Min 7 days, max 12 months
   - Vehicle condition upon return: Damage liability
   - Mileage limits and overage fees
   - Insurance requirements & coverage

2. **Payment Terms**
   - Deposit: 25–50% due at booking (depends on duration)
   - Remaining balance: Due before pickup
   - Accepted payment methods: Checkout.com (credit/debit card, Apple Pay, Google Pay)
   - Refund policy: 7-day cancellation window with 10% fee; no refunds after vehicle pickup

3. **KYC & Eligibility**
   - Must be 21+ and hold valid driving licence
   - Emirates ID (UAE residents) or passport + visa (expats)
   - Driving record check required
   - Insurance eligibility verification

4. **User Responsibilities**
   - Use of vehicle in compliance with UAE traffic laws
   - No commercial use (e.g., taxi, ride-sharing)
   - Return vehicle on time; late fees apply
   - Report accidents/damage immediately

5. **Limitation of Liability**
   - Origin not liable for accidents/injuries during lease
   - Comprehensive insurance mandatory
   - Third-party liability: Min AED 500K (per UAE law)

6. **Dispute Resolution**
   - Governed by laws of Dubai, UAE
   - Disputes resolved through DIAC (Dubai International Arbitration Centre)
   - No class-action arbitration

---

### App Permissions & Privacy Declarations (IOS)

Apple requires **Privacy Manifest** declarations for SDKs and API usage. In Xcode:

**File > New > "Privacy Manifest"** (creates `PrivacyInfo.xcprivacy`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- NSPrivacyTracking: Does app track users across third-party websites/apps? -->
  <key>NSPrivacyTracking</key>
  <false/>

  <!-- NSPrivacyTrackingDomains: Leave empty if tracking is false -->
  <key>NSPrivacyTrackingDomains</key>
  <array/>

  <!-- Sensitive API Usage Declaration -->
  <key>NSPrivacySensitiveDataTypes</key>
  <array>
    <!-- User ID / Device ID -->
    <dict>
      <key>NSPrivacySensitiveDataType</key>
      <string>UserID</string>
      <key>NSPrivacySensitiveDataTypeLinked</key>
      <true/> <!-- Linked to user identity -->
      <key>NSPrivacySensitiveDataTypeTracking</key>
      <false/>
      <key>NSPrivacySensitiveDataTypeReason</key>
      <array>
        <string>app-functionality</string>
      </array>
    </dict>

    <!-- Location Data -->
    <dict>
      <key>NSPrivacySensitiveDataType</key>
      <string>Precise Location</string>
      <key>NSPrivacySensitiveDataTypeLinked</key>
      <true/>
      <key>NSPrivacySensitiveDataTypeTracking</key>
      <false/>
      <key>NSPrivacySensitiveDataTypeReason</key>
      <array>
        <string>app-functionality</string> <!-- For Google Maps pickup/dropoff selection -->
      </array>
    </dict>

    <!-- Contact Info (Email, Phone from KYC) -->
    <dict>
      <key>NSPrivacySensitiveDataType</key>
      <string>Contact Info</string>
      <key>NSPrivacySensitiveDataTypeLinked</key>
      <true/>
      <key>NSPrivacySensitiveDataTypeTracking</key>
      <false/>
      <key>NSPrivacySensitiveDataTypeReason</key>
      <array>
        <string>app-functionality</string> <!-- For lease communications -->
      </array>
    </dict>
  </array>

  <!-- Third-Party SDK Declarations -->
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- Firebase Analytics -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>User ID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>App Functionality</string>
      </array>
    </dict>

    <!-- Checkout.com Payment SDK -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>Payment Information</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>App Functionality</string> <!-- Payment processing -->
      </array>
    </dict>
  </array>
</dict>
</plist>
```

---

### App Permissions & Privacy Declarations (Android)

Android uses **AndroidManifest.xml** for permissions (no separate privacy manifest yet, but Google is introducing Privacy Dashboard in Android 14+).

**Minimal AndroidManifest.xml:**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.origincarleasing.app">

    <!-- Essential Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- NOT Used (do not include) -->
    <!-- <uses-permission android:name="android.permission.READ_CONTACTS" /> -->
    <!-- <uses-permission android:name="android.permission.READ_SMS" /> -->

    <application>
      <!-- Your activities and services -->
    </application>

</manifest>
```

---

### Testing Before Submission (Shared)

#### 1. Device Testing Checklist

**iOS:**
- iPhone 11, 12, 13+ (minimum iOS 12)
- iPad (landscape orientation)
- Test on both WiFi and cellular

**Android:**
- API 24 (Android 7), API 29 (Android 10), API 33 (Android 13)
- Various screen sizes: 5" to 6.7"
- Test on both WiFi and cellular

**Testing Scenarios:**
- [ ] **Cold Start:** Kill app, relaunch, ensure no crash
- [ ] **Network Latency:** Test on poor connection; check error handling
- [ ] **RTL (Arabic):** Rotate to landscape, ensure UI adjusts correctly
- [ ] **Landscape Mode:** All screens usable in landscape
- [ ] **Payment Flow:** Test with sandbox payment gateway; ensure success/failure handling
- [ ] **KYC Upload:** Upload sample documents; verify file validation
- [ ] **Notifications:** Ensure Firebase push notifications display correctly
- [ ] **WhatsApp Deep Link:** Tap WhatsApp button; should open WhatsApp chat
- [ ] **Battery/Storage:** App doesn't drain battery or storage excessively
- [ ] **Crash Reporting:** Trigger a crash; verify Sentry receives report

---

#### 2. Functional Testing (App-Specific)

- [ ] Car catalogue loads without placeholder images
- [ ] Filters work (brand, price, category)
- [ ] Lease calculator shows VAT separately
- [ ] Booking form accepts all required fields
- [ ] Payment completes successfully (sandbox mode)
- [ ] Confirmation email sent after booking
- [ ] Customer portal displays active leases
- [ ] WhatsApp integration initiates chat correctly
- [ ] Push notifications delivered on time

---

#### 3. Security Testing

- [ ] No hardcoded API keys in app binary (check with strings command)
- [ ] HTTPS used for all API calls (no HTTP)
- [ ] Sensitive data (tokens, PII) not logged to console
- [ ] Keystore password not committed to version control

---

## Post-Launch Monitoring

### Crash Reports & Analytics

#### 1. Firebase Console

**URL:** https://console.firebase.google.com

**Monitor:**
- **Crash Reporting:** View crashes by OS/device/version
- **Analytics:** Track key events (app_open, booking_initiated, booking_confirmed, payment_successful)
- **Performance:** Monitor app startup time, frame rate

**Action Items:**
- If crash rate > 1%, investigate and hotfix (v1.0.1)
- If specific device/OS has high crash rate, debug and patch

---

#### 2. Sentry Dashboard

**URL:** https://sentry.io/ (your project dashboard)

**Monitor:**
- **Error Stack Traces:** Investigate new errors in real-time
- **Release Tracking:** Group errors by app version
- **Alerts:** Set threshold for error rate; get notified if exceeded

---

### User Review Monitoring

#### iOS (App Store)

**In App Store Connect > Ratings and Reviews:**
- Monitor new reviews daily for first 2 weeks
- Address 1-star reviews with respectful, helpful responses
- Highlight in responses: How to contact support via WhatsApp

**Common Early Issues & Responses:**
- *"App crashed on launch"* → Request to uninstall/reinstall; monitor Sentry for reports
- *"Can't upload documents"* → Check file size/format requirements; provide FAQ link
- *"Payment failed"* → Verify Checkout.com integration; request contact via WhatsApp

---

#### Android (Google Play)

**In Google Play Console > User Feedback:**
- Monitor reviews and ratings
- Respond to 1–2 star reviews within 24 hours
- Use "Reply to Review" feature to help users

---

### Daily Operations

**First 24 Hours Post-Launch:**
- Monitor crash rate every 2 hours
- Check review boards for critical feedback
- Have dev team on standby for hotfixes

**First Week:**
- Daily crash rate monitoring
- Weekly analytics review
- Any crash rate > 1% → immediate investigation

**First Month:**
- Weekly review of analytics, crashes, and user feedback
- Plan next version (v1.1.0) based on user requests
- Monitor for security updates in dependencies

---

## Update & Versioning Strategy

### Version Numbering

**Format:** `MAJOR.MINOR.PATCH` (Semantic Versioning)

- **1.0.0:** Initial release
- **1.0.1:** Hotfix (bug fixes, no new features) — resubmit same day if critical
- **1.1.0:** Minor release (new features, improvements) — resubmit within 1 week
- **2.0.0:** Major release (breaking changes) — plan for quarterly cadence

---

### Update Schedule

| Timeline | Version | Type | Focus |
|---|---|---|---|
| Day 1 | 1.0.0 | Initial | Launch |
| Day 3–7 | 1.0.1 | Hotfix | Critical bugs from launch feedback |
| Week 2–3 | 1.1.0 | Feature | Arabic/Chinese UI improvements, user-requested features |
| Month 2 | 1.1.1 | Hotfix | Bug fixes from 1.1.0 feedback |
| Q2 2026 | 1.2.0 | Feature | Warranty management, fleet tracking |
| Q3 2026 | 1.3.0 | Feature | Invoice history, subscription leases |
| Q4 2026 | 2.0.0 | Major | Redesign, new payment methods, GCC expansion |

---

### Submitting Updates

#### For Hotfixes (Patch Version):

1. Fix bug in code
2. Increment version in:
   - `pubspec.yaml`: `version: 1.0.1+2`
   - Xcode: Build Number → `2`
   - Android: versionCode → `2`
3. Build & upload to both stores
4. **Note in Release Notes:** "Hotfix: Fixed crash on booking confirmation" (concise)
5. Submit with **Phased Rollout:** 10% → 50% → 100% (monitor for regressions)

#### For Minor Versions:

1. Implement new features
2. Increment version: `1.1.0+3` (increment build number)
3. Write **detailed release notes** (3–5 bullet points)
4. Submit to both stores
5. Use **Staged Rollout:** Start at 5%, increase to 100% over 3 days

#### For Major Versions:

1. Plan 4–6 week development cycle
2. Increment version: `2.0.0+4`
3. Comprehensive release notes + marketing push
4. Submit to both stores
5. Coordinate with marketing team for press release

---

### Rollback Plan

If critical issue discovered post-launch:

1. **Immediate:** Acknowledge issue in app store reviews/support channels
2. **Within 2 hours:** Deploy hotfix (v1.0.1)
3. **Phased rollout:** 5% → 25% (monitor crashes)
4. **If crash rate > 5%:** Pause rollout and revert to v1.0.0
5. **Communicate:** Inform users via WhatsApp/email of issue and ETA for fix

---

### Dependency Updates

**Schedule:**
- **Security patches:** Deploy within 48 hours (Firebase, SDKs, etc.)
- **Major library updates:** Plan quarterly (breaking changes require testing)
- **Minor updates:** Deploy monthly (backward compatible)

**Process:**
1. Update `pubspec.yaml` / `build.gradle` / `Podfile`
2. Run full test suite
3. Test on iOS 12 and Android 7+ (minimum versions)
4. Deploy as patch version (e.g., 1.0.2)

---

## Appendix: Key Contacts & Resources

**Apple Developer**
- **Apple Developer Program:** https://developer.apple.com/programs
- **App Store Connect:** https://appstoreconnect.apple.com
- **Support:** https://developer.apple.com/support

**Google Play**
- **Google Play Console:** https://play.google.com/console
- **Developer Policies:** https://play.google.com/about/developer-content-policy
- **Support:** https://support.google.com/googleplay

**Third-Party Services**
- **Checkout.com:** https://checkout.com (support@checkout.com)
- **Firebase Console:** https://console.firebase.google.com
- **Sentry:** https://sentry.io/ (support@sentry.io)
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Google Maps API**: https://developers.google.com/maps

**UAE Regulatory**
- **RTA (Roads and Transport Authority):** https://www.rta.ae/
- **UAE Federal Data Protection Law:** Federal Decree-Law No. 45 of 2021
- **DIAC (Dubai International Arbitration Centre):** https://www.diac.ae/

---

**Document Version:** 1.0
**Last Updated:** March 2026
**Next Review:** Before v1.1.0 release