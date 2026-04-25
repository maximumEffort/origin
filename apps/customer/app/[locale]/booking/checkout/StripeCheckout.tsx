'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';
import { CreditCard, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PK ?? '';

const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

function PaymentForm({ amountAed, locale }: { amountAed: number; locale: string }) {
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/booking/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? t('paymentError') ?? 'Payment failed.');
      setProcessing(false);
    } else if (result.paymentIntent?.status === 'succeeded') {
      setSuccess(true);
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('paymentSuccess')}</h2>
        <p className="text-neutral-500 text-sm mb-6">{t('paymentSuccessDesc')}</p>
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
        >
          {t('goToDashboard')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <CreditCard size={18} className="text-brand" />
        <h2 className="text-base font-semibold text-neutral-900">{t('paymentDetails')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <PaymentElement options={{ layout: 'tabs' }} />

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {processing ? (
            <><Loader2 size={16} className="animate-spin" /> {t('processing')}</>
          ) : (
            <><Lock size={16} /> {t('payNow')} — AED {amountAed.toLocaleString()}</>
          )}
        </button>

        <p className="text-xs text-neutral-400 text-center mt-3">
          <Lock size={10} className="inline me-1" />
          {t('secureNote')}
        </p>
      </form>
    </div>
  );
}

interface Props {
  amountAed: number;
  bookingRef?: string;
  vehicleName: string;
  locale: string;
}

export default function StripeCheckout({ amountAed, bookingRef, vehicleName, locale }: Props) {
  const t = useTranslations('checkout');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!STRIPE_PK) {
      setLoading(false);
      setError(t('integrationPending'));
      return;
    }

    if (!amountAed || amountAed <= 0) {
      setLoading(false);
      setError(t('integrationPending'));
      return;
    }

    fetch('/api/backend/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountAed,
        bookingRef: bookingRef ?? '',
        vehicleName,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(t('integrationPending'));
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [amountAed, bookingRef, vehicleName, t]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-8 text-center text-neutral-400">
        <Loader2 className="animate-spin mx-auto mb-3" size={24} />
        {t('processing')}
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error || t('integrationPending')}
        </div>
      </div>
    );
  }

  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#163478',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm amountAed={amountAed} locale={locale} />
    </Elements>
  );
}
