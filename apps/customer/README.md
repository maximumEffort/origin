# [Company Name] — Website

Next.js 14 website for the Chinese car leasing platform, supporting English, Arabic (RTL), and Simplified Chinese.

## Getting Started

```bash
cd website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Page |
|---|---|
| `/en` | Homepage (English) |
| `/ar` | Homepage (Arabic, RTL) |
| `/zh` | Homepage (Chinese) |
| `/en/cars` | Car catalogue |
| `/en/cars/[id]` | Car detail + lease calculator |
| `/en/calculator` | Standalone lease calculator |
| `/en/booking` | Booking flow (Phase 2 next) |
| `/en/account` | Customer portal (Phase 2 next) |

## Key Tech

- **Next.js 14** App Router
- **next-intl** for i18n routing and translations
- **Tailwind CSS** + `tailwindcss-rtl` for RTL Arabic support
- All prices in AED, VAT (5%) calculated and displayed separately

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=https://api.your-domain.ae/v1
NEXT_PUBLIC_WHATSAPP_NUMBER=971500000000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
```