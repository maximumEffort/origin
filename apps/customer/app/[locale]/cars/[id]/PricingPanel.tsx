'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ShoppingCart, Clock, FileText, Car } from 'lucide-react';

interface Props {
  carId: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  colour: string;
  /** Selling price */
  priceAed: number;
  /** Rental rate per month (with km limit) */
  monthlyAed: number;
  dailyAed: number;
  mileageLimit: number;
  /** Lease instalment per month (no km limit, 36 months) */
  leaseMonthlyAed: number;
  downPaymentPct: number;
  whatsappUrl: string;
}

type ServiceTab = 'buy' | 'rent' | 'lease';

export default function PricingPanel({
  carId, brand, model, year, category, colour,
  priceAed, monthlyAed, dailyAed, mileageLimit,
  leaseMonthlyAed, downPaymentPct, whatsappUrl,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [tab, setTab] = useState<ServiceTab>('rent');

  const downPayment = Math.round(priceAed * downPaymentPct);
  const vat5 = (amount: number) => Math.round(amount * 0.05);

  const tabs: { key: ServiceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'buy', label: t('services.buy'), icon: <ShoppingCart size={15} /> },
    { key: 'lease', label: t('services.lease'), icon: <FileText size={15} /> },
    { key: 'rent', label: t('services.rent'), icon: <Clock size={15} /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-20">
      <span className="text-xs font-semibold text-brand uppercase tracking-wider">{brand}</span>
      <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-1">{model}</h1>
      <p className="text-sm text-neutral-500 mb-5">{year} · {category} · {colour}</p>

      {/* Service type tabs */}
      <div className="flex border border-neutral-200 rounded-lg p-1 mb-5">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
              tab === t_.key
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t_.icon}
            {t_.label}
          </button>
        ))}
      </div>

      {/* BUY */}
      {tab === 'buy' && (
        <div>
          {priceAed > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-neutral-900">{t('common.aed')} {priceAed.toLocaleString()}</span>
              </div>
              <p className="text-xs text-neutral-500 mb-4">{t('services.buyDesc')}</p>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('services.vehiclePrice')}</span>
                  <span className="font-medium">AED {priceAed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('calculator.vat')}</span>
                  <span className="font-medium">AED {vat5(priceAed).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold">
                  <span>{t('services.totalPrice')}</span>
                  <span>AED {(priceAed + vat5(priceAed)).toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 text-sm mb-5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-brand">{t('services.reservationFee')}</span>
                    <p className="text-xs text-neutral-500 mt-0.5">{t('services.reservationDesc')}</p>
                  </div>
                  <span className="font-bold text-brand text-lg">AED 1,000</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-neutral-500 text-sm py-4">{t('services.contactForPrice')}</p>
          )}
        </div>
      )}

      {/* RENT */}
      {tab === 'rent' && (
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
      )}

      {/* LEASE */}
      {tab === 'lease' && (
        <div>
          {leaseMonthlyAed > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-neutral-900">{t('common.aed')} {leaseMonthlyAed.toLocaleString()}</span>
                <span className="text-neutral-500">{t('fleet.perMonth')}</span>
              </div>
              <p className="text-xs text-neutral-500 mb-4">{t('services.leaseDesc')}</p>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('services.downPayment')}</span>
                  <span className="font-medium">AED {downPayment.toLocaleString()} ({Math.round(downPaymentPct * 100)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('services.monthlyInstalment')}</span>
                  <span className="font-medium">AED {leaseMonthlyAed.toLocaleString()} × 36</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('services.mileage')}</span>
                  <span className="font-medium text-green-600">{t('services.unlimited')}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold">
                  <span>{t('services.totalCost')}</span>
                  <span>AED {(downPayment + leaseMonthlyAed * 36).toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-neutral-500 text-sm py-4">{t('services.contactForPrice')}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {tab === 'buy' ? (
          <>
            <Link
              href={`/${locale}/booking?car=${carId}&service=buy`}
              className="block w-full text-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
            >
              {t('services.reserveNow')}
            </Link>
            <Link
              href={`/${locale}/booking?car=${carId}&service=buy&testdrive=1`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-colors"
            >
              <Car size={18} />
              {t('services.requestTestDrive')}
            </Link>
          </>
        ) : (
          <Link
            href={`/${locale}/booking?car=${carId}&service=${tab}`}
            className="block w-full text-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
          >
            {tab === 'rent' ? t('services.rentNow') : t('services.leaseNow')}
          </Link>
        )}
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
