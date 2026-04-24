import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CorporateForm from './CorporateForm';

export function generateStaticParams() {
  return ['en', 'ar', 'zh-CN'].map((locale) => ({ locale }));
}

export default async function CorporatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <CorporateForm locale={locale} />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
