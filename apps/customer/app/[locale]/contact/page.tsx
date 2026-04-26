import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ContactForm from './ContactForm';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';

const metaByLocale: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Contact Origin — Chinese EV Rental Dubai',
    description:
      'Reach Origin via WhatsApp, phone or email. Premium Chinese electric vehicle rental in Dubai — we reply within minutes in English, Arabic or Chinese.',
  },
  ar: {
    title: 'اتصل بـ Origin — تأجير السيارات الكهربائية الصينية في دبي',
    description:
      'تواصل مع Origin عبر واتساب أو الهاتف أو البريد الإلكتروني. تأجير سيارات صينية كهربائية فاخرة في دبي — نرد خلال دقائق بالعربية أو الإنجليزية أو الصينية.',
  },
  'zh-CN': {
    title: '联系 Origin — 迪拜中国电动汽车租赁',
    description:
      '通过 WhatsApp、电话或电邮联系 Origin。迪拜高端中国电动汽车租赁 — 我们在几分钟内以中文、英文或阿拉伯语回复。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = metaByLocale[locale] ?? metaByLocale.en;
  const pageUrl = `${SITE_URL}/${locale}/contact`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: `${SITE_URL}/en/contact`,
        ar: `${SITE_URL}/ar/contact`,
        'zh-CN': `${SITE_URL}/zh-CN/contact`,
      },
    },
    openGraph: { title: meta.title, description: meta.description, url: pageUrl, type: 'website' },
  };
}

export function generateStaticParams() {
  return ['en', 'ar', 'zh-CN'].map((locale) => ({ locale }));
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <ContactForm />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
