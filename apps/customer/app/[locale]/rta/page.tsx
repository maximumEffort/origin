import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useTranslations } from 'next-intl';

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
