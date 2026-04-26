import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getTranslations } from 'next-intl/server';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Privacy Policy — UAE PDPL Compliant | Origin',
    description:
      'How Origin (Shanghai Car Rental LLC) collects, uses and protects personal data under UAE Federal Decree-Law No. 45 of 2021 (PDPL).',
  },
  ar: {
    title: 'سياسة الخصوصية — متوافقة مع قانون حماية البيانات الإماراتي | Origin',
    description:
      'كيف تجمع Origin (شركة شنغهاي لتأجير السيارات ذ.م.م) بياناتك الشخصية وتستخدمها وتحميها وفقًا للمرسوم بقانون اتحادي رقم 45 لسنة 2021.',
  },
  'zh-CN': {
    title: '隐私政策 — 符合阿联酋PDPL | Origin',
    description:
      'Origin（上海汽车租赁有限公司）如何根据阿联酋2021年第45号联邦法令（PDPL）收集、使用和保护个人数据。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/privacy`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/privacy`,
        ar: `${SITE_URL}/ar/privacy`,
        'zh-CN': `${SITE_URL}/zh-CN/privacy`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

const SECTIONS = ['lastUpdated', 'intro', 'dataCollect', 'dataUse', 'retention', 'rights', 'storage'] as const;

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

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
