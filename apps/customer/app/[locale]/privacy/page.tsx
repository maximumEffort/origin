import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getTranslations } from 'next-intl/server';

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
