import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import LeaseCalculator from '@/components/LeaseCalculator';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchVehicles } from '@/lib/api';
import { STATIC_VEHICLES } from '@/lib/static-vehicles';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Rental Calculator — Monthly Quote in AED | Origin',
    description:
      'Estimate your monthly Chinese EV rental in Dubai. Adjust duration, mileage and add-ons. Transparent AED pricing with VAT shown separately.',
  },
  ar: {
    title: 'حاسبة الإيجار — عرض شهري بالدرهم | Origin',
    description:
      'احسب التكلفة الشهرية لتأجير سيارة كهربائية صينية في دبي. اضبط المدة والمسافة والإضافات. أسعار شفافة بالدرهم وضريبة القيمة المضافة منفصلة.',
  },
  'zh-CN': {
    title: '租赁计算器 — 迪拉姆月度报价 | Origin',
    description:
      '计算您在迪拜租赁中国电动汽车的月度费用。调整租期、里程和附加项。透明的迪拉姆定价，增值税单独列示。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/calculator`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/calculator`,
        ar: `${SITE_URL}/ar/calculator`,
        'zh-CN': `${SITE_URL}/zh-CN/calculator`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

async function getDefaultRate(): Promise<number> {
  try {
    const res = await fetchVehicles({ limit: 1 });
    if (res.data?.[0]) return Number(res.data[0].monthlyRateAed);
  } catch {
    // Fallback silently
  }
  return Math.min(...STATIC_VEHICLES.map((v) => v.monthlyAed));
}

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, defaultRate] = await Promise.all([getTranslations('calculator'), getDefaultRate()]);

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1">{t('title')}</h1>
            <p className="text-neutral-500">{t('subtitle')}</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 sm:p-8">
            <LeaseCalculator baseMonthlyAed={defaultRate} />
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
