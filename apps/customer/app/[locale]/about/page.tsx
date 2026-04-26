import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { ArrowRight, Shield, Star, Users, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'About Origin — Premium Chinese EV Rental in Dubai',
    description:
      'Operated by Shanghai Car Rental LLC. Premium Chinese electric vehicle rental in Dubai — transparent pricing, comprehensive insurance, RTA compliant.',
  },
  ar: {
    title: 'عن Origin — تأجير سيارات صينية كهربائية فاخرة في دبي',
    description:
      'تشغّلها شركة شنغهاي لتأجير السيارات ذ.م.م. تأجير سيارات صينية كهربائية فاخرة في دبي — تسعير شفاف، تأمين شامل، ومتوافق مع هيئة الطرق.',
  },
  'zh-CN': {
    title: '关于 Origin — 迪拜高端中国电动汽车租赁',
    description:
      '由上海汽车租赁有限公司运营。迪拜高端中国电动汽车租赁 — 透明定价、综合保险、符合RTA法规。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/about`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/about`,
        ar: `${SITE_URL}/ar/about`,
        'zh-CN': `${SITE_URL}/zh-CN/about`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

export function generateStaticParams() {
  return ['en', 'ar', 'zh-CN'].map((locale) => ({ locale }));
}

type ValueItem = { icon: LucideIcon; title: string; desc: string };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');

  const stats = [
    { value: t('stat1Value'), label: t('stat1Label') },
    { value: t('stat2Value'), label: t('stat2Label') },
    { value: t('stat3Value'), label: t('stat3Label') },
    { value: t('stat4Value'), label: t('stat4Label') },
  ];

  const values: ValueItem[] = [
    { icon: Shield, title: t('value1'), desc: t('value1Desc') },
    { icon: Star,   title: t('value2'), desc: t('value2Desc') },
    { icon: Users,  title: t('value3'), desc: t('value3Desc') },
    { icon: Clock,  title: t('value4'), desc: t('value4Desc') },
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — aligned to brand dark palette */}
        <section className="relative overflow-hidden pt-32 pb-20 bg-hero">
          {/* Dot grid */}
          <div className="absolute inset-0 hero-grid pointer-events-none" />
          {/* Ambient glow */}
          <div className="absolute -top-32 -start-32 w-[500px] h-[500px] bg-brand/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 end-0 w-[300px] h-[300px] bg-brand-dark/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand/20 text-brand-light border border-brand/30 mb-6">
              {t('badge')}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white">{t('title')}</h1>
            <p className="text-lg max-w-2xl mx-auto leading-relaxed text-white/70">{t('subtitle')}</p>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-brand py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-white/80 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission & Why */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">{t('missionTitle')}</h2>
                <p className="text-neutral-600 leading-relaxed">{t('missionText')}</p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">{t('whyTitle')}</h2>
                <p className="text-neutral-600 leading-relaxed">{t('whyText')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center mb-12">{t('valuesTitle')}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="bg-white rounded-xl p-6 border border-neutral-100 shadow-sm">
                    <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon size={20} className="text-brand" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">{v.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">{t('ctaTitle')}</h2>
            <p className="text-neutral-500 leading-relaxed mb-8">{t('ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/cars`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
              >
                {t('ctaBook')} <ArrowRight size={16} />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-neutral-200 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {t('ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
