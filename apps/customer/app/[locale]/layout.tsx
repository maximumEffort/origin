import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import CookieConsent from '@/components/CookieConsent';
import AuthProvider from '@/components/AuthProvider';

const locales = ['en', 'ar', 'zh-CN'];

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: 'Origin — Chinese Car Leasing Dubai',
    description:
      'Premium NIO, Voyah, Zeekr and BYD electric vehicle leasing in Dubai, UAE. Flexible terms, comprehensive insurance, RTA compliant.',
    ogLocale: 'en_AE',
  },
  ar: {
    title: 'Origin — \u062A\u0623\u062C\u064A\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0635\u064A\u0646\u064A\u0629 \u062F\u0628\u064A',
    description:
      '\u062A\u0623\u062C\u064A\u0631 \u0633\u064A\u0627\u0631\u0627\u062A NIO \u0648Voyah \u0648Zeekr \u0648BYD \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0627\u0644\u0641\u0627\u062E\u0631\u0629 \u0641\u064A \u062F\u0628\u064A \u2014 \u0634\u0631\u0648\u0637 \u0645\u0631\u0646\u0629\u060C \u062A\u0623\u0645\u064A\u0646 \u0634\u0627\u0645\u0644\u060C \u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 \u0647\u064A\u0626\u0629 \u0627\u0644\u0637\u0631\u0642 \u0648\u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062A.',
    ogLocale: 'ar_AE',
  },
  'zh-CN': {
    title: 'Origin — \u8FEA\u62DC\u4E2D\u56FD\u6C7D\u8F66\u79DF\u8D41',
    description:
      '\u8FEA\u62DC\u963F\u8054\u914B\u9AD8\u7AEF\u84DD\u56FE\u3001\u5D5A\u6765\u3001\u6781\u6C2A\u3001\u6BD4\u4E9A\u8FEA\u7535\u52A8\u6C7D\u8F66\u79DF\u8D41\u2014\u2014\u7075\u6D3B\u79DF\u671F\uFF0C\u7EFC\u5408\u4FDD\u9669\uFF0C\u7B26\u5408RTA\u6CD5\u89C4\u3002',
    ogLocale: 'zh_CN',
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Next.js 15+: params is a Promise — must be awaited
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}`;

  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: pageUrl,
      languages: {
        'en': `${SITE_URL}/en`,
        'ar': `${SITE_URL}/ar`,
        'zh-CN': `${SITE_URL}/zh-CN`,
        'x-default': `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: pageUrl,
      siteName: 'Origin',
      locale: meta.ogLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    icons: {
      icon: '/icon.svg',
    },
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CarDealer',
  name: 'Origin',
  description: 'Premium Chinese electric car leasing in Dubai, UAE \u2014 NIO, Voyah, Zeekr, BYD.',
  url: SITE_URL,
  telephone: '+971521439746',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Horizon Tower 2, Unit 2502, Creek Harbour',
    addressLocality: 'Dubai',
    addressRegion: 'Dubai',
    addressCountry: 'AE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 25.2048,
    longitude: 55.2708,
  },
  openingHours: 'Su-Th 09:00-18:00',
  priceRange: 'AED 2,400 \u2013 4,500 / month',
  currenciesAccepted: 'AED',
  paymentAccepted: 'Credit Card, Debit Card',
  areaServed: 'Dubai, United Arab Emirates',
};

function getFontsUrl(locale: string): string {
  const families = ['Inter:wght@300;400;500;600;700'];
  if (locale === 'ar') families.push('Noto+Sans+Arabic:wght@300;400;500;600;700');
  if (locale === 'zh-CN') families.push('Noto+Sans+SC:wght@300;400;500;700');
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

// Next.js 15+: params is a Promise — must be awaited
// Next.js 15+: headers() is async — must be awaited
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const isRtl = locale === 'ar';
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={getFontsUrl(locale)} rel="stylesheet" />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-lg">
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
            <CookieConsent />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
