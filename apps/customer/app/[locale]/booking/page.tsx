import type { Metadata } from 'next';
import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import BookingFlow from './BookingFlow';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Book Your Rental — Chinese EV in Dubai | Origin',
    description:
      'Reserve a premium Chinese electric vehicle for monthly rental in Dubai. Choose duration, add-ons and delivery in a few simple steps.',
  },
  ar: {
    title: 'احجز إيجارك — سيارة صينية كهربائية في دبي | Origin',
    description:
      'احجز سيارة صينية كهربائية للإيجار الشهري في دبي. اختر المدة والإضافات والتوصيل في خطوات بسيطة.',
  },
  'zh-CN': {
    title: '预订您的租赁 — 迪拜中国电动汽车 | Origin',
    description:
      '预订一辆优质中国电动汽车在迪拜按月租赁。选择租期、附加项和交付方式，几步即可完成。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/booking`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/booking`,
        ar: `${SITE_URL}/ar/booking`,
        'zh-CN': `${SITE_URL}/zh-CN/booking`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

export function generateStaticParams() {
  return ['en', 'ar', 'zh-CN'].map((locale) => ({ locale }));
}

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <Suspense>
          <BookingFlow locale={locale} />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
