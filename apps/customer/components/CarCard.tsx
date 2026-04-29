import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';

export interface CarCardProps {
  id: string;
  brand: string;
  model: string;
  category: string;
  monthlyAed: number;
  imageUrl: string;
  available: boolean;
}

/** Subtle brand-tinted background for the image area */
function getBrandBg(brand: string): string {
  const b = brand.toLowerCase();
  if (b.includes('byd')) return 'bg-blue-50';
  if (b.includes('haval') || b.includes('gwm')) return 'bg-emerald-50';
  if (b.includes('chery') || b.includes('omoda')) return 'bg-rose-50';
  if (b.includes('geely') || b.includes('jaecoo')) return 'bg-amber-50';
  return 'bg-neutral-100';
}

/**
 * CarCard — fleet listing card used in the homepage fleet grid and /cars catalogue.
 * Server component: reads locale + translations internally.
 */
export default async function CarCard({
  id,
  brand,
  model,
  category,
  monthlyAed,
  imageUrl,
  available,
}: CarCardProps) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const brandBg = getBrandBg(brand);

  return (
    <Link href={`/${locale}/cars/${id}`} className="block group car-card-lift">
      <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100 group-hover:border-brand/20 transition-colors duration-200">

        {/* Image */}
        <div className={`aspect-[16/10] relative overflow-hidden ${brandBg}`}>
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={`${brand} ${model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl font-bold text-neutral-300">{brand} {model}</span>
            </div>
          )}
          {/* Availability badge — overlaid on image */}
          <span
            className={`absolute top-3 end-3 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm border ${
              available
                ? 'bg-green-500/15 text-green-600 border-green-500/20'
                : 'bg-neutral-500/15 text-neutral-500 border-neutral-400/20'
            }`}
          >
            {available ? t('fleet.available') : t('fleet.rented')}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[11px] font-bold text-brand uppercase tracking-widest mb-0.5">{brand}</p>
          <h3 className="font-semibold text-neutral-900 text-base mb-0.5">{model}</h3>
          <p className="text-xs text-neutral-500 mb-4">{t.has(`fleet.cat.${category}`) ? t(`fleet.cat.${category}`) : category}</p>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-neutral-500">{t('fleet.from')}</p>
              <p className="font-bold text-neutral-900 text-lg leading-tight">
                {t('common.aed')} {monthlyAed.toLocaleString()}
                <span className="text-xs font-normal text-neutral-500 ms-1">{t('fleet.perMonth')}</span>
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">{t('fleet.vatNote')}</p>
            </div>
            <span className="text-xs font-semibold text-brand group-hover:text-brand-dark transition-colors flex items-center gap-1">
              {t('fleet.rentNow')}
              <ChevronRight size={13} className="rtl-flip" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
