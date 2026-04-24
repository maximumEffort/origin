import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import PricingPanel from './PricingPanel';
import { whatsappUrl } from '@/lib/constants';
import { fetchVehicle } from '@/lib/api';
import { getStaticVehicle, STATIC_VEHICLES } from '@/lib/static-vehicles';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckCircle, Fuel, Users, Gauge, Shield } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/** Correct known backend data errors. */
const MODEL_CORRECTIONS: Record<string, string> = {
  WRX: 'Seal',
};

export function generateStaticParams() {
  const carIds = STATIC_VEHICLES.map((v) => v.id);
  const locales = ['en', 'ar', 'zh-CN'];
  return locales.flatMap((locale) => carIds.map((id) => ({ locale, id })));
}

async function getCar(id: string) {
  try {
    const v = await fetchVehicle(id);
    if (v && v.id) {
      const img = v.images?.find((i: { isPrimary: boolean }) => i.isPrimary) ?? v.images?.[0];
      return {
        id: v.id,
        brand: v.brand,
        model: MODEL_CORRECTIONS[v.model] ?? v.model,
        year: v.year,
        category: v.category?.nameEn ?? v.fuelType,
        fuel: v.fuelType?.toLowerCase() ?? 'petrol',
        transmission: v.transmission ?? 'Automatic',
        seats: v.seats,
        colour: v.colour ?? '',
        monthlyAed: Number(v.monthlyRateAed),
        dailyAed: Number(v.dailyRateAed),
        mileageLimit: v.mileageLimitMonthly ?? 3000,
        imageUrl: img?.url ?? '',
        features: (v as any).notes ? String((v as any).notes).split(',').map((f: string) => f.trim()).filter(Boolean) : [],
        priceAed: Number((v as any).priceAed ?? 0),
        leaseMonthlyAed: Number((v as any).leaseMonthlyAed ?? 0),
        downPaymentPct: Number((v as any).downPaymentPct ?? 0.20),
      };
    }
  } catch (err) {
    console.warn('[Origin] Vehicle API error, using static data:', (err as Error).message);
  }
  const sv = getStaticVehicle(id);
  if (!sv) return null;
  return {
    id: sv.id,
    brand: sv.brand,
    model: sv.model,
    year: sv.year,
    category: sv.category,
    fuel: sv.fuel,
    transmission: sv.transmission,
    seats: sv.seats,
    colour: sv.colour,
    monthlyAed: sv.monthlyAed,
    dailyAed: sv.dailyAed,
    mileageLimit: sv.mileageLimit,
    imageUrl: sv.imageUrl,
    features: sv.features,
    priceAed: sv.priceAed ?? 0,
    leaseMonthlyAed: sv.leaseMonthlyAed ?? 0,
    downPaymentPct: 0.20,
  };
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const car = await getCar(id);
  if (!car) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-neutral-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Link href={`/${locale}`} className="hover:text-brand transition-colors">{t('nav.home')}</Link>
              <span>/</span>
              <Link href={`/${locale}/cars`} className="hover:text-brand transition-colors">{t('fleet.title')}</Link>
              <span>/</span>
              <span className="text-neutral-700">{car.brand} {car.model}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Image & specs */}
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 mb-4">
                {car.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={car.imageUrl} alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-neutral-300">{car.brand} {car.model}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: Fuel,   label: t(`fleet.fuel.${car.fuel as 'electric' | 'petrol' | 'hybrid'}`) },
                  { icon: Users,  label: `${car.seats} ${t('fleet.seats')}` },
                  { icon: Gauge,  label: car.transmission },
                  { icon: Shield, label: t('fleet.insuranceIncl') },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-white border border-neutral-100 rounded-lg p-3 flex flex-col items-center gap-1 text-center">
                    <Icon size={16} className="text-brand" />
                    <span className="text-xs text-neutral-600 font-medium">{label}</span>
                  </div>
                ))}
              </div>
              {car.features.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-100 p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">{t('fleet.keyFeatures')}</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {car.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-neutral-600">
                        <CheckCircle size={14} className="text-brand mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Pricing */}
            <div>
              <PricingPanel
                carId={car.id}
                brand={car.brand}
                model={car.model}
                year={car.year}
                category={car.category}
                colour={car.colour}
                priceAed={car.priceAed}
                monthlyAed={car.monthlyAed}
                dailyAed={car.dailyAed}
                mileageLimit={car.mileageLimit}
                leaseMonthlyAed={car.leaseMonthlyAed}
                downPaymentPct={car.downPaymentPct}
                whatsappUrl={whatsappUrl(t('whatsapp.carInterest', { brand: car.brand, model: car.model }))}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
