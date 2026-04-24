'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  baseMonthlyAed: number;
}

const VAT_RATE = 0.05;
const MILEAGE_OPTIONS = [2000, 3000, 4000, 5000];
const DURATION_OPTIONS = [1, 3, 6, 12, 24];

export default function LeaseCalculator({ baseMonthlyAed }: Props) {
  const t = useTranslations('calculator');
  const tc = useTranslations('common');

  const [duration, setDuration] = useState(6);
  const [mileage, setMileage] = useState(3000);
  const [extraDriver, setExtraDriver] = useState(false);

  const quote = useMemo(() => {
    let monthly = baseMonthlyAed;

    // Mileage surcharge
    if (mileage > 3000) monthly += (mileage - 3000) * 0.05;

    // Extra driver add-on
    if (extraDriver) monthly += 150;

    // Long-term discount
    if (duration >= 12) monthly = monthly * 0.93;
    else if (duration >= 6) monthly = monthly * 0.97;

    const subtotal = monthly * duration;
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    const deposit = monthly;

    return {
      monthly: Math.round(monthly),
      subtotal: Math.round(subtotal),
      vat: Math.round(vat),
      total: Math.round(total),
      deposit: Math.round(deposit),
    };
  }, [baseMonthlyAed, duration, mileage, extraDriver]);

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-neutral-900">{t('title')}</h3>

      {/* Duration */}
      <div>
        <label className="block text-sm text-neutral-500 mb-2">{t('duration')}</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                duration === d
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand'
              }`}
            >
              {d} {d === 1 ? t('month') : t('months')}
            </button>
          ))}
        </div>
      </div>

      {/* Mileage */}
      <div>
        <label className="block text-sm text-neutral-500 mb-2">{t('mileage')}</label>
        <div className="flex flex-wrap gap-2">
          {MILEAGE_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMileage(m)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                mileage === m
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand'
              }`}
            >
              {m.toLocaleString()} {t('kmMonth')}
            </button>
          ))}
        </div>
      </div>

      {/* Extra driver */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={extraDriver}
          onChange={(e) => setExtraDriver(e.target.checked)}
          className="w-4 h-4 accent-brand"
        />
        <span className="text-sm text-neutral-600">{t('additionalDriver')}</span>
      </label>

      {/* Quote summary */}
      <div className="bg-neutral-50 rounded-xl p-4 space-y-2 border border-neutral-100">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">{t('monthlyPayment')}</span>
          <span className="font-semibold text-neutral-900">{tc('aed')} {quote.monthly.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">{t('deposit')}</span>
          <span className="font-semibold text-neutral-900">{tc('aed')} {quote.deposit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">{t('vat')}</span>
          <span className="text-neutral-600">{tc('aed')} {quote.vat.toLocaleString()}</span>
        </div>
        <div className="pt-2 border-t border-neutral-200 flex justify-between">
          <span className="font-semibold text-neutral-900">{t('totalCost')}</span>
          <span className="font-bold text-lg text-brand">{tc('aed')} {quote.total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}