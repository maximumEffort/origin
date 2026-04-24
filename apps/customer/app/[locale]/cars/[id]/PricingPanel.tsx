'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

interface Props {
  carId: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  colour: string;
  /** Rental rate per month (with km limit) */
  monthlyAed: number;
  dailyAed: number;
  mileageLimit: number;
  whatsappUrl: string;
}

/**
 * PricingPanel — rental-only (V1).
 *
 * V1 scope is rental only. Buy / Lease-to-own require separate UAE licences
 * (commercial dealership, Central Bank finance licence respectively) which
 * Origin does not yet hold. The backend ServiceType enum retains SELL and
 * LEASE — do not remove the related fields, they'll be re-enabled in V2/V3.
 */
export default function PricingPanel({
  carId, brand, model, year, category, colour,
  monthlyAed, dailyAed, mileageLimit,
  whatsappUrl,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-20">
      <span className="text-xs font-semibold text-brand uppercase tracking-wider">{brand}</span>
      <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-1">{model}</h1>
      <p className="text-sm text-neutral-500 mb-5">{year} · {category} · {colour}</p>

      {/* Rental pricing */}
      <div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-neutral-900">{t('common.aed')} {monthlyAed.toLocaleString()}</span>
          <span className="text-neutral-500">{t('fleet.perMonth')}</span>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          {t('fleet.vatNote')} · {t('services.kmLimit', { km: mileageLimit.toLocaleString() })}
        </p>
        <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('services.dailyRate')}</span>
            <span className="font-medium">AED {dailyAed.toLocaleString()} / {t('services.day')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('services.monthlyRate')}</span>
            <span className="font-medium">AED {monthlyAed.toLocaleString()} / {t('services.month')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">{t('services.mileage')}</span>
            <span className="font-medium">{mileageLimit.toLocaleString()} km / {t('services.month')}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link
          href={`/${locale}/booking?car=${carId}`}
          className="block w-full text-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
        >
          {t('services.rentNow')}
        </Link>
        <a
          href={whatsappUrl}
          target="_blank" rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#1ebe5d] transition-colors"
        >
          {t('common.whatsapp')}
        </a>
      </div>
    </div>
  );
}
