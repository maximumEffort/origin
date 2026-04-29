import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { ArrowLeft } from 'lucide-react';
import StripeCheckout from './StripeCheckout';
import { fmtDate, fmtAed } from '@/lib/format';

export function generateStaticParams() {
  return ['en', 'ar', 'zh-CN'].map((locale) => ({ locale }));
}

type SearchParams = {
  car?: string;
  duration?: string;
  startDate?: string;
  monthlyRate?: string;
  deposit?: string;
  vat?: string;
  total?: string;
  bookingId?: string;
  ref?: string;
  service?: string;
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([
    getTranslations('checkout'),
    getTranslations('common'),
  ]);
  const aedLabel = tCommon('aed');

  const car = sp.car ?? '—';
  const duration = sp.duration ? `${sp.duration} ${t('months')}` : '—';
  // #139 §2 — incoming `startDate` is YYYY-MM-DD; UAE renders as DD/MM/YYYY.
  const startDate = sp.startDate ? fmtDate(sp.startDate) : '—';
  // V1: rental only. Buy's AED 1,000 reservation fee flow returns in V2.
  const depositNum = Number(sp.deposit ?? 0);
  const vatNum = Number(sp.vat ?? 0);
  const totalNum = Number(sp.total ?? 0);
  // #139 §11 — currency label goes through i18n so Arabic renders `د.إ`.
  const deposit = depositNum ? fmtAed(depositNum, aedLabel) : '—';
  const vat = vatNum ? `${aedLabel} ${vatNum.toFixed(2)}` : '—';
  const total = totalNum ? fmtAed(totalNum, aedLabel) : '—';
  const paymentAmount = totalNum;

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('title')}</h1>
          <p className="text-neutral-300">{t('subtitle')}</p>
        </div>
      </section>

      <section className="py-12 bg-neutral-50 min-h-[60vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Order summary */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">{t('orderSummary')}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('vehicle')}</span>
                <span className="font-medium text-neutral-900">{car}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t('rentalPeriod')}</span>
                <span className="font-medium text-neutral-900">{duration}</span>
              </div>
              {startDate !== '—' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('startDate')}</span>
                  <span className="font-medium text-neutral-900">{startDate}</span>
                </div>
              )}
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('deposit')}</span>
                  <span className="font-medium text-neutral-900">{deposit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('vat')}</span>
                  <span className="font-medium text-neutral-900">{vat}</span>
                </div>
              </div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between">
                <span className="font-bold text-neutral-900">{t('totalDue')}</span>
                <span className="font-bold text-brand text-lg">{total}</span>
              </div>
            </div>
          </div>

          {/* Stripe payment form. The amount actually charged is derived
              server-side from the booking row (#128); paymentAmount here is
              for the button label only. */}
          <StripeCheckout
            amountAed={paymentAmount}
            bookingId={sp.bookingId ?? ''}
            locale={locale}
          />

          <div className="mt-6 flex items-center justify-between">
            <Link
              href={`/${locale}/booking`}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />{t('back')}
            </Link>
          </div>

        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
