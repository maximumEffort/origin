import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useLocale } from 'next-intl';
import CarsGrid from './CarsGrid';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Browse Our Fleet — Chinese EV Rental Dubai | Origin',
    description:
      'Explore premium Chinese electric vehicles available for monthly rent in Dubai. NIO, Voyah, Zeekr, BYD. Filter by category and book online.',
  },
  ar: {
    title:
      'تصفّح أسطولنا — تأجير السيارات الكهربائية الصينية في دبي | Origin',
    description:
      'استكشف سيارات كهربائية صينية فاخرة متاحة للإيجار الشهري في دبي. NIO وVoyah وZeekr وBYD. صفّح حسب الفئة واحجز عبر الإنترنت.',
  },
  'zh-CN': {
    title: '浏览车辆 — 迪拜中国电动汽车租赁 | Origin',
    description:
      '探索可在迪拜按月租赁的优质中国电动汽车。蔚来、岚图、极氪、比亚迪。按类别筛选并在线预订。',
  },
};

// Next.js 15+: params is a Promise — must be awaited
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/cars`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/cars`,
        ar: `${SITE_URL}/ar/cars`,
        'zh-CN': `${SITE_URL}/zh-CN/cars`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: pageUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function CarsPage() {
  const locale = useLocale();

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        <CarsGrid locale={locale} />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
