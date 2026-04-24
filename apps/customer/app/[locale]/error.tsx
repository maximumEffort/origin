'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('error');

  useEffect(() => {
    // Log the error to an error reporting service (Sentry, etc.)
    console.error('[Origin] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-gold" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          {t('title')}
        </h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          {t('description')}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
          >
            <RotateCcw size={16} />
            {t('tryAgain')}
          </button>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={16} className={locale === 'ar' ? 'rtl-flip' : ''} />
            {t('goHome')}
          </Link>
        </div>

        {/* Error digest for debugging */}
        {error.digest && (
          <p className="mt-8 text-xs text-neutral-600">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
