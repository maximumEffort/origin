'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import { STATIC_VEHICLES } from '@/lib/static-vehicles';

interface CarCard {
  id: string;
  brand: string;
  model: string;
  category: string;
  fuel: string;
  monthlyAed: number;
  seats: number;
  available: boolean;
  imageUrl: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

/** Correct known backend data errors. */
const MODEL_CORRECTIONS: Record<string, string> = {
  WRX: 'Seal',
};

/** Inline localised "no results" copy.
 * TODO: migrate to t('fleet.noResults') once locale files are updated.
 */
function getNoResultsText(locale: string): string {
  if (locale === 'ar') return 'لا توجد سيارات تطابق هذه التصفية.';
  if (locale === 'zh-CN') return '没有车辆匹配这些筛选条件。';
  return 'No vehicles match these filters.';
}

/** Map a vehicle into one of the four UI filter buckets. */
function toFilterCategory(fuel: string, category: string): string {
  if (fuel === 'electric') return 'electric';
  const c = category.toLowerCase();
  if (c.includes('mpv')) return 'mpv';
  if (c.includes('sedan')) return 'sedan';
  return 'suv';
}

function staticFallback(): CarCard[] {
  return STATIC_VEHICLES.map((v) => ({
    id: v.id,
    brand: v.brand,
    model: v.model,
    category: toFilterCategory(v.fuel, v.category),
    fuel: v.fuel,
    monthlyAed: v.monthlyAed,
    seats: v.seats,
    available: v.available,
    imageUrl: v.imageUrl,
  }));
}

/** Attempt to refresh fleet data from API (5 s timeout). Returns null if unavailable. */
async function fetchCarsClient(): Promise<CarCard[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}/vehicles?limit=20`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    if (json.data?.length) {
      return json.data.map((v: Record<string, unknown>) => {
        const images = v.images as { url: string; isPrimary: boolean }[] | undefined;
        const img = images?.find((i) => i.isPrimary) ?? images?.[0];
        const fuel = (v.fuelType as string)?.toLowerCase() ?? 'petrol';
        const categoryName = (v.category as { nameEn?: string })?.nameEn ?? '';
        return {
          id: v.id as string,
          brand: v.brand as string,
          model: MODEL_CORRECTIONS[v.model as string] ?? (v.model as string),
          category: toFilterCategory(fuel, categoryName),
          fuel,
          monthlyAed: Number(v.monthlyRateAed),
          seats: v.seats as number,
          available: v.status === 'AVAILABLE',
          imageUrl: img?.url ?? '',
        };
      });
    }
  } catch (err) {
    clearTimeout(timeout);
    console.info('[Origin] Cars API unavailable, using static data:', (err as Error).message);
  }
  return null;
}

export default function CarsGrid({ locale }: { locale: string }) {
  const t = useTranslations();
  const [activeFilter, setActiveFilter] = useState('all');
  // Initialize with static data immediately so SSR always renders car cards.
  // useEffect silently upgrades to live API data when available.
  const [cars, setCars] = useState<CarCard[]>(() => staticFallback());

  useEffect(() => {
    fetchCarsClient().then((data) => {
      if (data) setCars(data);
    });
  }, []);

  const filters = [
    { key: 'all',      label: t('fleet.filterAll') },
    { key: 'electric', label: t('fleet.filterElectric') },
    { key: 'suv',      label: t('fleet.filterSuv') },
    { key: 'sedan',    label: t('fleet.filterSedan') },
    { key: 'mpv',      label: 'MPV' },
  ];

  const filtered =
    activeFilter === 'all'
      ? cars
      : cars.filter((c) => c.category === activeFilter);

  return (
    <>
      {/* Page header */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-1">{t('fleet.title')}</h1>
          <p className="text-neutral-500">{t('fleet.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <SlidersHorizontal size={16} className="text-neutral-500" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                activeFilter === f.key
                  ? 'border-brand bg-brand text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand hover:text-brand'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ms-auto text-xs text-neutral-500">
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <p className="text-lg">{getNoResultsText(locale)}</p>
            <button onClick={() => setActiveFilter('all')} className="mt-3 text-brand text-sm font-medium hover:underline">{t('common.viewAll')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((car) => (
              <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
                <div className="group bg-white rounded-xl overflow-hidden border border-neutral-100 hover:shadow-md hover:border-brand/20 transition-all duration-200 h-full">
                  {/* Car photo */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-neutral-100">
                    <Image
                      src={car.imageUrl || '/icon.svg'}
                      alt={`${car.brand} ${car.model}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!car.available && (
                      <div className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold px-3 py-1 bg-neutral-800/80 rounded-full">
                          {t('fleet.leased')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">{car.brand}</span>
                    <h3 className="font-bold text-neutral-900 mt-0.5 mb-1">{car.model}</h3>
                    <div className="flex gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">{t(`fleet.fuel.${car.fuel as 'electric' | 'petrol' | 'hybrid'}`)}</span>
                      <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">{car.seats} {t('fleet.seats')}</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-neutral-500">{t('services.rent')} {t('fleet.from').toLowerCase()}</span>
                        <span className="font-bold text-lg text-neutral-900">{t('common.aed')} {car.monthlyAed.toLocaleString()}</span>
                      </div>
                      <span className="text-xs text-neutral-500">{t('fleet.perMonth')} · {t('fleet.vatNote')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
