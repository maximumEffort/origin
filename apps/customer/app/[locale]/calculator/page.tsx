import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import LeaseCalculator from '@/components/LeaseCalculator';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchVehicles } from '@/lib/api';
import { STATIC_VEHICLES } from '@/lib/static-vehicles';

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
