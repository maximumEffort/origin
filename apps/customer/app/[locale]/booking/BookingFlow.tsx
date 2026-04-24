'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, ArrowRight, ArrowLeft, Upload, MessageCircle, LogIn } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { STATIC_VEHICLES } from '@/lib/static-vehicles';
import { useAuth } from '@/components/AuthProvider';
import { getAccessToken } from '@/lib/auth';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

interface CarOption {
  id: string;
  brand: string;
  model: string;
  category: string;
  monthlyAed: number;
  available: boolean;
}

function staticCars(): CarOption[] {
  return STATIC_VEHICLES.map((v) => ({
    id: v.id, brand: v.brand, model: v.model,
    category: v.category, monthlyAed: v.monthlyAed, available: v.available,
  }));
}

const RENT_DURATIONS = [1, 3, 6, 12, 24];

interface Addons {
  insurance: boolean;
  driver: boolean;
  gps: boolean;
}

interface DocFile {
  name: string;
  size: number;
}

interface Docs {
  emiratesId: DocFile | null;
  drivingLicence: DocFile | null;
  visa: DocFile | null;
  passport: DocFile | null;
}

export default function BookingFlow({ locale }: { locale: string }) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { customer, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [CARS, setCars] = useState<CarOption[]>(() => staticCars());

  // Pre-select car and skip to Step 2 when ?car= is in the URL
  // V1: rental only. Service type is forced to 'rent' — Buy/Lease are
  // hidden from UX pending UAE dealership / finance licences (see CLAUDE.md).
  const preselectedCar = searchParams.get('car') || '';
  const validPreselection = CARS.some((c) => c.id === preselectedCar);

  const [step, setStep] = useState(validPreselection ? 2 : 1);
  const [carId, setCarId] = useState(validPreselection ? preselectedCar : '');

  // Fetch real cars from API
  useEffect(() => {
    fetch(`${API_BASE}/vehicles?limit=50`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json?.data?.length) {
          const apiCars = json.data.map((v: Record<string, unknown>) => ({
            id: v.id as string,
            brand: v.brand as string,
            model: v.model as string,
            category: (v.category as { nameEn?: string })?.nameEn ?? '',
            monthlyAed: Number(v.monthlyRateAed),
            available: v.status === 'AVAILABLE',
          }));
          setCars(apiCars);
          // Fix pre-selection if car ID is from API (not in static data)
          if (preselectedCar && !carId && apiCars.some((c: CarOption) => c.id === preselectedCar)) {
            setCarId(preselectedCar);
            setStep(2);
          }
        }
      })
      .catch(() => {});
  }, [preselectedCar, carId]);
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState(6);
  const [pickupAddress, setPickupAddress] = useState('');
  const [addons, setAddons] = useState<Addons>({ insurance: false, driver: false, gps: false });
  const [docs, setDocs] = useState<Docs>({ emiratesId: null, drivingLicence: null, visa: null, passport: null });
  const [processing, setProcessing] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedCar = CARS.find((c) => c.id === carId);

  const addonCost =
    (addons.insurance ? 200 : 0) +
    (addons.driver ? 100 : 0) +
    (addons.gps ? 50 : 0);

  const monthlyRate = selectedCar ? selectedCar.monthlyAed + addonCost : 0;
  const deposit = monthlyRate;
  const vat = parseFloat((deposit * 0.05).toFixed(2));
  const totalDue = parseFloat((deposit + vat).toFixed(2));

  const steps = [t('step1'), t('step2'), t('step3'), t('step4')];

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'd like to book a vehicle.")}`;

  const router = useRouter();

  const handlePayNow = async () => {
    if (!selectedCar || !customer) return;
    setProcessing(true);

    try {
      // Calculate end date from start date + duration
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + duration);
      const endDateStr = end.toISOString().split('T')[0];

      const token = getAccessToken();

      // Step 1: Create booking (DRAFT)
      const createRes = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          vehicle_id: selectedCar.id,
          start_date: startDate,
          end_date: endDateStr,
          mileage_package: 3000,
          add_ons: {
            premium_insurance: addons.insurance,
            dedicated_driver: addons.driver,
            gps_tracker: addons.gps,
          },
          pickup_location: pickupAddress || undefined,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to create booking');
      }

      const booking = await createRes.json();

      // Step 2: Submit booking for review
      const submitRes = await fetch(`${API_BASE}/bookings/${booking.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to submit booking');
      }

      // Step 3: Redirect to checkout with booking details
      const params = new URLSearchParams({
        bookingId: booking.id,
        ref: booking.reference,
        car: `${selectedCar.brand} ${selectedCar.model}`,
        duration: String(duration),
        startDate,
        service: 'rent',
        monthlyRate: String(booking.quotedTotalAed ? Math.round(booking.quotedTotalAed / duration) : monthlyRate),
        deposit: String(booking.depositAmountAed ?? deposit),
        vat: String(booking.vatAmountAed ?? vat),
        total: String(booking.grandTotalAed ?? totalDue),
      });
      router.push(`/${locale}/booking/checkout?${params.toString()}`);
    } catch (err) {
      setProcessing(false);
      setBookingError(err instanceof Error ? err.message : tCommon('error'));
      return;
    }
  };

  const toggleAddon = (key: keyof Addons) =>
    setAddons((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleFileSelect = (key: keyof Docs, file: File) =>
    setDocs((prev) => ({ ...prev, [key]: { name: file.name, size: file.size } }));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('title')}</h1>
          <p className="text-neutral-300">{t('subtitle')}</p>
        </div>
      </section>

      {/* Step progress */}
      <section className="bg-white border-b border-neutral-100 py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            {steps.map((label, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
              return (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    done || active ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {done ? <Check size={14} /> : idx}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ms-2 ${
                    active ? 'text-neutral-900' : 'text-neutral-500'
                  }`}>
                    {label}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 ${
                      done ? 'bg-brand' : 'bg-neutral-100'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step content */}
      <section className="py-12 bg-neutral-50 min-h-[60vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Step 1: Select Vehicle ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('selectTitle')}</h2>
              <p className="text-neutral-500 text-sm mb-8">{t('selectSubtitle')}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {CARS.filter((c) => c.available !== false).map((car) => (
                  <button
                    key={car.id}
                    onClick={() => setCarId(car.id)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      carId === car.id
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-brand uppercase tracking-wide mb-1">{car.brand}</div>
                        <div className="font-semibold text-neutral-900">{car.model}</div>
                        <div className="text-xs text-neutral-500">{car.category}</div>
                      </div>
                      {carId === car.id && (
                        <span className="bg-brand text-white text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
                          {t('selected')}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-sm font-bold text-neutral-900">
                      {tCommon('aed')} {car.monthlyAed.toLocaleString()}
                      <span className="font-normal text-neutral-500 ms-1">{t('months')}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-between items-center">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#25D366] font-medium">
                  <MessageCircle size={16} />{t('whatsappAlt')}
                </a>
                <button
                  disabled={!carId}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-40"
                >
                  {t('next')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Rental Details ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-8">{t('detailsTitle')}</h2>
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 space-y-6">

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t('startDate')}</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t('duration')}</label>
                    <div className="flex gap-2 flex-wrap">
                      {RENT_DURATIONS.map((d) => (
                        <button key={d} onClick={() => setDuration(d)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            duration === d ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}>
                          {d} {t('months')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t('pickupLabel')}</label>
                  <input type="text" placeholder={t('pickupPlaceholder')} value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                </div>

                {/* Add-ons */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">{t('addonsLabel')}</label>
                  <div className="space-y-3">
                    {([
                      { key: 'insurance' as const, label: t('addonInsurance') },
                      { key: 'driver'    as const, label: t('addonDriver') },
                      { key: 'gps'       as const, label: t('addonGPS') },
                    ]).map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={addons[key]} onChange={() => toggleAddon(key)} className="w-4 h-4 accent-brand" />
                        <span className="text-sm text-neutral-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium">
                  <ArrowLeft size={16} />{t('back')}
                </button>
                <button
                  disabled={!startDate}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-40"
                >
                  {t('next')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: KYC Documents ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('kycTitle')}</h2>
              <p className="text-neutral-500 text-sm mb-8">{t('kycSubtitle')}</p>
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 space-y-4">
                {([
                  { key: 'emiratesId'    as const, label: t('emiratesId') },
                  { key: 'drivingLicence' as const, label: t('drivingLicence') },
                  { key: 'visa'          as const, label: t('visa') },
                  { key: 'passport'      as const, label: t('passport') },
                ]).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-neutral-100 rounded-lg">
                    <input
                      ref={(el) => { fileInputRefs.current[key] = el; }}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(key, file);
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900">{label}</div>
                      {docs[key] ? (
                        <div className="text-xs text-green-600 mt-0.5 truncate">{docs[key].name} ({formatFileSize(docs[key].size)})</div>
                      ) : (
                        <div className="text-xs text-neutral-500 mt-0.5">{t('uploadHint')}</div>
                      )}
                    </div>
                    <div className="shrink-0 ms-4">
                      {docs[key] ? (
                        <button
                          onClick={() => fileInputRefs.current[key]?.click()}
                          className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <Check size={14} /> {t('uploaded')}
                        </button>
                      ) : (
                        <button
                          onClick={() => fileInputRefs.current[key]?.click()}
                          className="flex items-center gap-1.5 text-sm font-medium text-brand bg-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors"
                        >
                          <Upload size={14} /> {t('uploadBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-3">* {t('emiratesId')} & {t('drivingLicence')} — {t('uploadHint')}</p>
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium">
                  <ArrowLeft size={16} />{t('back')}
                </button>
                <button
                  disabled={!docs.emiratesId?.name || !docs.drivingLicence?.name}
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-40"
                >
                  {t('next')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Pay ── */}
          {step === 4 && selectedCar && (
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-8">{t('reviewTitle')}</h2>
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('vehicle')}</span>
                  <span className="font-medium text-neutral-900">{selectedCar.brand} {selectedCar.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('leasePeriod')}</span>
                  <span className="font-medium text-neutral-900">{duration} {t('months')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('monthlyRate')}</span>
                  <span className="font-medium text-neutral-900">AED {monthlyRate.toLocaleString()}</span>
                </div>
                <div className="border-t border-neutral-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">{t('deposit')}</span>
                    <span className="font-medium text-neutral-900">AED {deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">{t('vat')}</span>
                    <span className="font-medium text-neutral-900">AED {vat.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-4 flex justify-between">
                  <span className="font-bold text-neutral-900">{t('totalDue')}</span>
                  <span className="font-bold text-brand text-lg">AED {totalDue.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-500 mb-6">
                {t('termsNote')}{' '}
                <Link href={`/${locale}/terms`} className="text-brand hover:underline">
                  {t('termsLink')}
                </Link>.
              </p>

              {/* Login prompt if not authenticated */}
              {!customer && !authLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center">
                  <p className="text-sm text-amber-800 mb-3">{tAuth('loginRequired')}</p>
                  <Link
                    href={`/${locale}/login?redirect=/${locale}/booking${carId ? `?car=${carId}` : ''}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors text-sm"
                  >
                    <LogIn size={16} />
                    {tAuth('loginToContinue')}
                  </Link>
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
                  {bookingError}
                </div>
              )}

              <div className="flex justify-between items-center">
                <button onClick={() => { setBookingError(''); setStep(3); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium">
                  <ArrowLeft size={16} />{t('back')}
                </button>
                <button
                  onClick={handlePayNow}
                  disabled={processing || !customer}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
                >
                  {processing ? t('processing') : t('confirmPay')}
                </button>
              </div>

              <div className="mt-6 text-center">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#25D366] font-medium">
                  <MessageCircle size={16} />{t('whatsappAlt')}
                </a>
              </div>
            </div>
          )}

        </div>
      </section>
    </>
  );
}
