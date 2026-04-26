import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getTranslations } from 'next-intl/server';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Terms & Conditions — Vehicle Rental Agreement | Origin',
    description:
      'Terms governing rental of vehicles from Origin (Shanghai Car Rental LLC). Eligibility, insurance, mileage, VAT, termination and governing law in the UAE.',
  },
  ar: {
    title: 'الشروط والأحكام — اتفاقية إيجار المركبات | Origin',
    description:
      'الشروط التي تحكم إيجار المركبات من Origin (شركة شنغهاي لتأجير السيارات ذ.م.م). الأهلية، التأمين، المسافة، ضريبة القيمة المضافة، الإنهاء، والقانون الحاكم في الإمارات.',
  },
  'zh-CN': {
    title: '条款与条件 — 车辆租赁协议 | Origin',
    description:
      '适用于从 Origin（上海汽车租赁有限公司）租赁车辆的条款。资格、保险、里程、增值税、终止及阿联酋适用法律。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/terms`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/terms`,
        ar: `${SITE_URL}/ar/terms`,
        'zh-CN': `${SITE_URL}/zh-CN/terms`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

const SECTIONS = ['lastUpdated', 'intro', 'eligibility', 'insurance', 'mileage', 'vat', 'termination', 'governing'] as const;

export default async function TermsPage() {
  const t = await getTranslations('terms');

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">{t('title')}</h1>
          <div className="bg-white rounded-xl border border-neutral-100 p-8 space-y-4">
            {SECTIONS.map((key) => (
              <p key={key} className="text-neutral-600 leading-relaxed text-sm">
                {t(key)}
              </p>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
