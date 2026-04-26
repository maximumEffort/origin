import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useTranslations } from 'next-intl';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'RTA Compliance — Dubai Fleet Operator | Origin',
    description:
      'Origin is a registered Dubai RTA fleet operator. All vehicles carry valid RTA registration, comprehensive insurance and pre-delivery inspection.',
  },
  ar: {
    title: 'الامتثال لهيئة الطرق والمواصلات — مشغّل أسطول دبي | Origin',
    description:
      'Origin مشغّل أسطول مسجّل لدى هيئة الطرق والمواصلات في دبي. جميع المركبات تحمل تسجيلاً سارياً وتأميناً شاملاً وفحصاً قبل التسليم.',
  },
  'zh-CN': {
    title: 'RTA合规 — 迪拜车队运营商 | Origin',
    description:
      'Origin 是迪拜 RTA 注册车队运营商。所有车辆都持有有效的 RTA 注册、综合保险及交付前检查。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/rta`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/rta`,
        ar: `${SITE_URL}/ar/rta`,
        'zh-CN': `${SITE_URL}/zh-CN/rta`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

export default function RtaPage() {
  const t = useTranslations('rta');

  const paragraphs = [
    t('fleet'),
    t('licence'),
    t('registration'),
    t('insurance'),
    t('driver'),
    t('condition'),
    t('contact'),
  ];

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand border border-brand/20 rounded-full text-sm font-medium mb-6">
            {t('badge')}
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">{t('title')}</h1>
          <div className="bg-white rounded-xl border border-neutral-100 p-8 space-y-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="text-neutral-600 leading-relaxed text-sm">
                {paragraph}
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
